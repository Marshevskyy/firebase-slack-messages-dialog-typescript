// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
import * as functions from 'firebase-functions';
// The Firebase Admin SDK to access the Firebase Realtime Database.
import * as admin from 'firebase-admin';
import axios, { AxiosResponse } from 'axios';
import * as qs from 'querystring';
// I was getting weird validation erors when using `import * as schedule from 'node-schedule';`
// I'm too lasy to spend time on fixing that. that is why I changed it to require =)
const schedule = require('node-schedule');

admin.initializeApp();

////////// INTERFACES //////////

interface DialogConfigElement {
  label: string,
  type: string,
  name: string,
  value: string,
}

interface DialogConfig {
  title: string,
  callback_id: string,
  submit_label: string,
  elements: DialogConfigElement[],
}

interface DialogConfigElementValues {
  action_item_one: string,
  action_item_two: string,
}

interface Payload {
  trigger_id: string,
}

////////// CONSTANTS //////////

const apiUrl: string = 'https://slack.com/api';
const action_items_handler: admin.database.Reference = admin.database().ref('/action_items');

////////// UTILS //////////

const getDialogConfig = (values: DialogConfigElementValues): DialogConfig => ({
  title: 'Add/Edit Action Items',
  callback_id: 'actionItemId',
  submit_label: 'Submit',
  elements: [
    {
      label: 'First Action Item',
      type: 'text',
      name: 'action_item_one',
      value: values.action_item_one,
    },
    {
      label: 'Second Action Item',
      type: 'text',
      name: 'action_item_two',
      value: values.action_item_two,
    },
  ],
});

const getActionItemsFromDB = async (): Promise<DialogConfigElementValues> => {
  const snapshot: void | admin.database.DataSnapshot = await action_items_handler.once('value')
    .catch((e) => console.error('err', e));
  const data: DialogConfigElementValues = snapshot && snapshot.val() || {};
  return data;
}

const openDialog = async (payload: Payload) => {
  const data: DialogConfigElementValues = await getActionItemsFromDB();
  const dialog = {
    token: functions.config().slack.access_token,
    trigger_id: payload.trigger_id,
    dialog: JSON.stringify(getDialogConfig(data))
  };
  const promise: Promise<AxiosResponse<any>> = axios.post(`${apiUrl}/dialog.open`, qs.stringify(dialog));
  return promise;
};

////////// SCHEDULER //////////

// For instance, this will print a message on Monday and Thursday at 2pm: 
const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [1, 4];
rule.hour = 14;
rule.minute = 0;

schedule.scheduleJob(rule, async (fireDate: Date) => {
  const data: DialogConfigElementValues = await getActionItemsFromDB();
  sendMessageToSlack(data);
});

////////// EXTERNALL API //////////

const sendMessageToSlack = (data: DialogConfigElementValues): void => {
  const url = functions.config().slack.webhook_url;
  axios.post(url, {
    "text": "Retrospective Action Items",
    "attachments": [{
      "text": `${data.action_item_one}`,
      "mrkdwn_in": ["text", "pretext"]
    }, {
      "text": `${data.action_item_two}`,
      "mrkdwn_in": ["text", "pretext"]
    }]
  })
  .then(function (response) {
    console.log('sendMessage response', response);
  })
  .catch(function (error) {
    console.log('sendMessage error', error);
  });
};

////////// ROUTER API //////////

export const addActionItem = functions.https.onRequest(async (request, response) => {
  // Push the new message into the Realtime Database using the Firebase Admin SDK.
  const payload = JSON.parse(request.body.payload);
  const { action_item_one, action_item_two } = payload.submission;
  await action_items_handler.set({ action_item_one, action_item_two });
  // let slack know that all good.
  response.send('');
});

export const openActionItemsDialog: functions.HttpsFunction = functions.https.onRequest((request, res) =>
  openDialog(request.body)
    .then((result) => {
      console.log('dialog.open: %o', result.data);
      res.send('');
    }).catch((err) => {
      console.log('dialog.open call failed: %o', err);
      res.sendStatus(500);
    }));
