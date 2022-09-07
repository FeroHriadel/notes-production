'use strict';


//IMPORTS AND VARIABLES
const dynamoDB = require('aws-sdk/clients/dynamodb');
const documentClient = new dynamoDB.DocumentClient({ 
  region: 'us-east-1',
  maxRetries: 3, //occasionally dynamodb will take minutes before answering. But API Gateway timesout after 29 secs. This tells DynamoDB to abort if it takes too long and try one more time (actually 3 here). It's good for big-scale apps, where the dynamodb taking minutes issue sometimes appears.
  httpOptions: {
    timeout: 5000
  }
})
const NOTES_TABLE_NAME = process.env.NOTES_TABLE_NAME;



//HELPERS
const send = (statusCode, data) => {
  return {
    statusCode,
    body: JSON.stringify(data)
  }
}


//CREATE
module.exports.createNote = async (event, context, cb) => {
  context.callbackWaitsForEmptyEventLoop = false
  
  let data = JSON.parse(event.body);

  try {
    const params = {
      TableName: NOTES_TABLE_NAME,
      Item: {
        notesId: data.id,
        title: data.title,
        body: data.body
      },
      ConditionExpression: 'attribute_not_exists(notesId)' //this will error out if notesId already exists
    };

    await documentClient.put(params).promise();
    cb(null, {statusCode: 201, body: JSON.stringify(data)})

  } catch (error) {
    cb(null, {statusCode: 500, body: JSON.stringify({error: error.message || 'Something went wrong'})})
  }
};



//UPDATE
module.exports.updateNote = async (event, context, cb) => {
  context.callbackWaitsForEmptyEventLoop = false

  let notesId = event.pathParameters.id;
  let data = JSON.parse(event.body);

  try {
    const params = {
      TableName: NOTES_TABLE_NAME,
      Key: {notesId},
      UpdateExpression: `set #title = :title, #body = :body`,
      ExpressionAttributeNames: {
        '#title': 'title',
        '#body': 'body'
      },
      ExpressionAttributeValues: {
        ':title': data.title,
        ':body': data.body
      },
      ConditionExpression: 'attribute_exists(notesId)' //will error out if notesId doesn't exist
    }

    await documentClient.update(params).promise();
    cb(null, send(200, data))
    
  } catch (error) {
    cb(null, {statusCode: 500, body: JSON.stringify({error: error.message || 'Something went wrong'})})
  }
};



//DELETE
module.exports.deleteNote = async (event, context, cb) => {
  context.callbackWaitsForEmptyEventLoop = false

  let notesId = event.pathParameters.id;

  try {
    const params = {
      TableName: NOTES_TABLE_NAME,
      Key: {notesId},
      ConditionExpression: 'attribute_exists(notesId)'
    }

    await documentClient.delete(params).promise();
    cb(null, send(200, notesId))
    
  } catch (error) {
    cb(null, send(500, err.message))
  }  
};



//READ ALL
module.exports.getAllNotes = async (event, context, cb) => {
  context.callbackWaitsForEmptyEventLoop = false

  try {
    const params = {
      TableName: NOTES_TABLE_NAME,
    }

    const notes = await documentClient.scan(params).promise();
    cb(null, send(200, notes))


  } catch (error) {
    cb(null, send(500, err.message))
  }
};



