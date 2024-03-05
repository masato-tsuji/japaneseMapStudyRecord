/**
 * Copyright 2023 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

// [START all]
// [START import]
// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
const {logger} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");

// The Firebase Admin SDK to access Firestore.
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

initializeApp();
// [END import]


/**
 * Firestoreにある全記録を配列で返す
 * @returns [Array] - レコードのオブジェクトを要素に持つ配列
 */
const  getAllRec =  async () => {
 // Push the new message into Firestore using the Firebase Admin SDK.
  const resRecords = [];
  await getFirestore()
    .collection("JapaneseMapStudyRecord")
    .orderBy("second").orderBy("datetime")
    .get()
    .then((snapShot) => {
        snapShot.forEach((doc) => {
        let data = doc.data();
        resRecords.push({
          documentId: doc.id,
          name: data.name,
          record: data.record,
          second: data.second
        });
      })
    });
  return resRecords;
}


exports.getJmsRecord = onRequest(
  {cors: [/firebase\.com$/, "https://masato-tsuji.github.io"]},
  async (req, res) => {
  // [END addmessageTrigger]
  const limit = req.query.limit * 1;

  const allRecords = await getAllRec();

  // Send back a message that we've successfully written the message
  res.json({records: allRecords.slice(0, limit), header: req.headers});
});

/**
 *  受け取ったレコードがランクインしていたら保存して更新した順位データを返す
 * requestパラメータとしてname, record, limitを受け取る
 */
exports.addJmsRecord = onRequest(
  {cors: [/firebase\.com$/, "https://masato-tsuji.github.io"]},
  async (req, res) => {
  const clientIp = (req.headers["x-forwarded-for"]).split(",")[0]
  const name = req.query.name;
  const record = req.query.record;
  const timeSplit = record.split(":");
  const second = Number(timeSplit[0]) * 60 + Number(timeSplit[1]);

  const limit = req.query.limit * 1;

  // 全レコード取得
  const records = await getAllRec();
  let recordCnt = records.length;

  const upperRecordCount = 20;

  // 順位取得
  let rank = 1;
  for (let i = 0; i < recordCnt; i++) {
    if (records[i].second < second) {
      rank++;
    } else {
      break;
    }
  }


  // 上限未達又はランクインならデータ追加
  // writeResult.id => document id
  if (recordCnt < upperRecordCount || rank < recordCnt) {
    const writeResult = await getFirestore()
      .collection("JapaneseMapStudyRecord")
      .add({name: name, record: record, second: second, datetime: new Date(), client_ip: clientIp});
      // .add({name: name, record: record, datetime: new Date(), headers: req.headers});
  }

  // 最新レコード取得＆保存上限数超えなら削除
  // await db.collection('users')
  // .doc(documentPath)
  // .delete()
  const newRecord = await getAllRec();
  recordCnt = newRecord.length;
  // 順位再取得
  rank = 1;
  for (let i = 0; i < recordCnt; i++) {
    if (newRecord[i].second < second) {
      rank++;
    } else {
      break;
    }
  }

  
  res.json({records: newRecord.slice(0, limit), rank: rank});

});


// 検討中
/**
 * documentが追加されたらレコード数をカウントして上限を超えたら最後のレコードを削除
 */
// exports.makeuppercase = onDocumentCreated("/japaneseMapStudyRecord/{documentId}", (event) => {
//   const original = event.data.data().original;

//   // Access the parameter `{documentId}` with `event.params`
//   logger.log("Uppercasing", event.params.documentId, original);

//   const uppercase = original.toUpperCase();

//   return event.data.ref.set({uppercase}, {merge: true});
// });

