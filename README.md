# Example of slack messages using firebase

Before starting work on firebase, you setup Slack
* create App
* Incoming Webhooks
* Interactive Components
* Slash Commands
* OAuth & Permissions
* Bot Users

## How to deploy to firebase
* Review [getting started doc](https://firebase.google.com/docs/functions/get-started)
* ```bash $ firebase login```
* ```bash $ firebase deploy --only functions ```

## how to add/get configs to firebase
* ```bash $ firebase functions:config:set slack.access_token=XXXXXXXX ```
* ```bash $ firebase functions:config:get ```
