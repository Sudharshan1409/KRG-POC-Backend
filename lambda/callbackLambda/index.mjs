import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  GetCommand,
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import nodemailer from "nodemailer";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);

const s3Client = new S3Client({ region: "ap-south-1" });
const sesClient = new SESClient({ region: "ap-south-1" });

export const handler = async (event, context) => {
  console.log("Event: ", JSON.stringify(event));
  const eventBody = JSON.parse(
    event.body.split("\r\n\r\n")[1].split("\r\n")[0]
  );
  console.log("Event Body: ", JSON.stringify(eventBody));

  if (eventBody.event.event_type !== "signature_request_signed") {
    return {
      statusCode: 200,
      body: "Hello API Event Received",
    };
  }

  const id = eventBody.signature_request.metadata.id;

  // try {
  const s3Params = {
    Bucket: process.env.BUCKET_NAME,
    Key: `invoices/invoice_${id}.pdf`,
  };
  console.log("s3Params", JSON.stringify(s3Params, null, 2));
  const s3Object = await s3Client.send(new GetObjectCommand(s3Params));
  console.log("s3Object", s3Object);

  // create a nodemailer transporter with SES
  const transporter = nodemailer.createTransport({
    SES: { ses: sesClient, aws: { SendRawEmailCommand } },
  });

  const signers = eventBody.signature_request.signatures;

  let signerDetails = {};

  for (const signer of signers) {
    if (signer.status_code === "signed") {
      signerDetails.email = signer.signer_email_address;
      signerDetails.name = signer.signer_name;
      signerDetails.date = signer.signed_at;
    }
  }

  const mailOptions = {
    from: "agent1409official@gmail.com",
    to: "sudarshan61kv@gmail.com",
    subject: "Document Signed",
    text: `Hi, your document has been signed by ${signerDetails.name}
    Signer Email: ${signerDetails.email}`,
    attachments: [
      {
        filename: `approved_invoice_${id}.pdf`,
        content: s3Object.Body,
      },
    ],
  };
  console.log("Mail Options: ", mailOptions);

  const result = await transporter.sendMail(mailOptions);
  console.log("Mail Result: ", JSON.stringify(result));

  const ddbGetParams = {
    TableName: process.env.KRG_TABLE,
    Key: {
      id,
    },
  };
  console.log("ddbGetParams", JSON.stringify(ddbGetParams, null, 2));
  const ddbGetCommand = new GetCommand(ddbGetParams);
  const ddbGetResponse = await dynamoDocClient.send(ddbGetCommand);
  console.log("ddbGetResponse", JSON.stringify(ddbGetResponse, null, 2));

  const ddbPutParams = {
    TableName: process.env.KRG_TABLE,
    Item: {
      ...ddbGetResponse.Item,
      status: "approved",
      signerDetails: signerDetails,
    },
  };
  const ddbPutCommand = new PutCommand(ddbPutParams);
  const ddbPutResponse = await dynamoDocClient.send(ddbPutCommand);
  console.log("ddbPutResponse", JSON.stringify(ddbPutResponse, null, 2));

  return {
    statusCode: 200,
    body: "Hello API Event Received",
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
    },
  };
  // } catch (error) {
  //   console.log("Error: ", JSON.stringify(error));
  //   return {
  //     statusCode: 200,
  //     body: "Hello API Event Received",
  //     headers: {
  //       "Access-Control-Allow-Origin": "*",
  //       "Access-Control-Allow-Headers": "*",
  //       "Access-Control-Allow-Methods": "*",
  //     },
  //   };
  // }
};
