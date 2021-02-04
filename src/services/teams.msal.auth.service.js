import * as microsoftTeams from "@microsoft/teams-js";
import * as Msal from "msal";

// An authentication service that uses the MSAL.js and Teams.js library to sign in users with
// their AAD account. This leverages the AAD v2 endpoint.
class TeamsMsalAuthService {
  constructor() {
    // Initialize the Teams SDK
    microsoftTeams.initialize();

    this.api =
      window.location.hostname === "taskmeow.com"
        ? "api://taskmeow.com/36b1586d-b1da-45d2-9b32-899c3757b6f8/access_as_user"
        : "api://taskmeow.ngrok.io/botid-ab93102c-869b-4d34-a921-a31d3e7f76ef/access_as_user";

    this.app = new Msal.UserAgentApplication({
      auth: {
        clientId:
          window.location.hostname === "taskmeow.com"
            ? "36b1586d-b1da-45d2-9b32-899c3757b6f8"
            : "ab93102c-869b-4d34-a921-a31d3e7f76ef",
        redirectUri: `${window.location.origin}/tab/v2/silent-end`,
        navigateToLoginRequestUrl: false,
      },
      cache: {
        cacheLocation: "localStorage",
      },
    });
  }

  isCallback() {
    return this.app.isCallback(window.location.hash);
  }

  login() {
    if (!this.loginPromise) {
      this.loginPromise = new Promise((resolve, reject) => {
        // Start the login flow
        microsoftTeams.authentication.authenticate({
          url: `${window.location.origin}/tab/v2/silent-start`,
          width: 600,
          height: 535,
          successCallback: (response) => {
            console.log("Login succeeded:" + JSON.stringify(response));
            resolve(this.getUser());
          },
          failureCallback: (error) => {
            console.error("Login failed: " + JSON.stringify(error));
            this.loginPromise = null;
            reject(error);
          },
        });
      });
    }
    return this.loginPromise;
  }

  logout() {
    this.app.logout();
  }

  getUser() {
    return Promise.resolve(this.app.getAccount());
  }

  getToken() {
    return new Promise((resolve) => {
      microsoftTeams.getContext((context) => {
        resolve(context);
      });
    }).then((context) => {
      const domainHint =
        context.tid === "9188040d-6c67-4c5b-b112-36a304b66dad"
          ? "consumers"
          : "organizations";
      return this.app
        .acquireTokenSilent({
          loginHint: context.loginHint,
          scopes: [this.api],
          extraQueryParameters: { domain_hint: domainHint },
        })
        .then((response) => {
          console.log("Token refresh succeeded: " + JSON.stringify(response));
          return response.accessToken;
        })
        .catch((error) => {
          console.error("Token refresh failed: " + JSON.stringify(error));
          return Promise.reject(error);
        });
    });
  }
}

export default TeamsMsalAuthService;