import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });

const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("Event: ", JSON.stringify(event));
  const scanParams = {
    TableName: process.env.KRG_TABLE,
  };
  const scanCommand = new ScanCommand(scanParams);
  const scanResponse = await ddbDocClient.send(scanCommand);
  console.log("scanResponse", JSON.stringify(scanResponse, null, 2));
  scanResponse.Items.forEach((element) => {
    element.invoiceS3Key = `invoice_${element.id}.pdf`;
  });
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Success",
      data: scanResponse.Items,
    }),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
    },
  };
};
