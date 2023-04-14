import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import hellosign from "hellosign-sdk";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "ap-south-1",
});

const hellosignClient = new hellosign({
  key: process.env.HELLOSIGN_API_KEY,
});

const getPresignedUrl = async (params) => {
  const urlsPromises = [];
  for (const param of params) {
    console.log("param", param);
    const getObjectCommand = new GetObjectCommand(param);
    urlsPromises.push(getSignedUrl(s3Client, getObjectCommand));
  }
  const urls = await Promise.all(urlsPromises);
  return urls;
};

export const handler = async (event, context) => {
  console.log("Event: ", JSON.stringify(event));
  console.log("Environment Variables: ", JSON.stringify(process.env));

  const eventBody = JSON.parse(event.body);
  console.log("Event Body: ", JSON.stringify(eventBody));

  const getObjectParams = [];

  for (const file of eventBody.files) {
    console.log("file", file);
    let fileParams = [];
    fileParams.push({
      Bucket: process.env.BUCKET_NAME,
      Key: file.key,
      Expires: 3600,
    });
    for (const proof of file.proofs) {
      fileParams.push({
        Bucket: process.env.BUCKET_NAME,
        Key: proof,
        Expires: 3600,
      });
    }
    getObjectParams.push(fileParams);
  }

  console.log("getObjectParams: ", JSON.stringify(getObjectParams, null, 2));

  try {
    const s3Promises = [];
    for (const params of getObjectParams) {
      s3Promises.push(getPresignedUrl(params));
    }
    const s3Response = await Promise.all(s3Promises);
    console.log("S3 Response: ", s3Response);
    console.log("Calling HelloSign API");
    const hellosignPromises = [];
    for (const response of s3Response) {
      console.log("response", response);
      hellosignPromises.push(
        hellosignClient.signatureRequest.send({
          test_mode: 1,
          title: "Invoice Document",
          subject: "Document Signature Request",
          message:
            "Please sign this Invoice Document and then we can discuss more. Let me know if you have any questions.",
          signers: [
            {
              role: "Approver",
              group: "Stakeholders",
              [0]: {
                email_address: "sudarshan61kv@gmail.com",
                name: "Sudharshan V",
              },
              [1]: {
                email_address: "sudharshan1409@gmail.com",
                name: "Agent",
              },
            },
          ],
          file_url: response,
          metadata: {
            clientId: "1234",
            custom_text: "NDA #9",
          },
        })
      );
    }

    const hellosignResponse = await Promise.all(hellosignPromises);
    console.log(
      "HelloSign Response: ",
      JSON.stringify(hellosignResponse, null, 2)
    );
    console.log("checking...");
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Success",
      }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      },
    };
  } catch (err) {
    console.log("Error", err);
    return {
      statusCode: 500,
      body: {
        message: "Error",
        error: err,
      },
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      },
    };
  }
};

// import event from "./event.json" assert { type: "json" };
// console.log("Event: ", event);

// process.env.BUCKET_NAME = "krg-krgbucket-16q3toi2jz8dn";

// handler({ body: JSON.stringify(event) }, null);
