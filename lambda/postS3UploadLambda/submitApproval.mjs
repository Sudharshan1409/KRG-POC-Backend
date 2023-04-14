import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  GetCommand,
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import hellosign from "hellosign-sdk";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: "ap-south-1" });

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });

const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);

const hellosignClient = new hellosign({
  key: process.env.HELLOSIGN_API_KEY,
});

export const handler = async (event) => {
  console.log("Event: ", JSON.stringify(event));
  console.log("Environment Variables: ", JSON.stringify(process.env));
  const eventBody = JSON.parse(event.body);
  console.log("Event Body: ", JSON.stringify(eventBody));

  const fileKey = `invoices/invoice_${eventBody.id}.pdf`;

  const ddbGetParams = {
    TableName: process.env.KRG_TABLE,
    Key: {
      id: eventBody.id,
    },
  };
  const ddbGetCommand = new GetCommand(ddbGetParams);

  try {
    const ddbGetResponse = await dynamoDocClient.send(ddbGetCommand);

    console.log("ddbGetResponse", JSON.stringify(ddbGetResponse.Item, null, 2));

    const getObjectParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: fileKey,
      Expires: 3600,
    };
    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3Client, getObjectCommand);
    console.log("url", url);

    const response = await hellosignClient.signatureRequest.send({
      test_mode: 1,
      title: "Invoice Document",
      subject: "Document Signature Request",
      message:
        "Please sign this Invoice Document and then we can discuss more. Let me know if you have any questions.",
      signers: [
        {
          role: "Approvers",
          group: "Stakeholders",
          [0]: {
            email_address: "sudharshan@antstack.io",
            name: "Sudharshan V",
          },
          [1]: {
            email_address: "dheeraj@antstack.io",
            name: "Dheeraj",
          },
          [2]: {
            email_address: "rakshith@antstack.io",
            name: "Rakshith",
          },
        },
      ],
      file_url: [url],
      metadata: {
        id: eventBody.id,
      },
    });

    console.log("response", JSON.stringify(response, null, 2));

    const ddbPutParams = {
      TableName: process.env.KRG_TABLE,
      Item: {
        ...ddbGetResponse.Item,
        status: "pendingApproval",
        hellosignSignatureId: response.signature_request.signature_request_id,
      },
    };

    const ddbPutCommand = new PutCommand(ddbPutParams);

    await dynamoDocClient.send(ddbPutCommand);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Document sent for Approval",
      }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      },
    };
  } catch (error) {
    console.log("error", JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Something went wrong",
        error: error,
      }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      },
    };
  }
};
