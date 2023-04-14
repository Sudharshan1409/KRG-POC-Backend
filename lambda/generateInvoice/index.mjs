import PDFDocument from "pdfkit";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidV4 } from "uuid";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
export const handler = async (event) => {
  // Create a new PDF document
  const doc = new PDFDocument();

  console.log("Environment Variables: ", JSON.stringify(process.env, null, 2));
  console.log("Event: ", JSON.stringify(event, null, 2));
  const eventBody = JSON.parse(event.body);
  console.log("Event Body: ", JSON.stringify(eventBody, null, 2));

  const runDateFrom = eventBody.runDateFrom.split("T")[0];
  const runDateTo = eventBody.runDateTo.split("T")[0];

  // Set the line width and stroke color
  doc.lineWidth(1).strokeColor("black");

  // Set the page dimensions
  const page_width = doc.page.width;
  const page_height = doc.page.height;

  let border_height = 10;
  let border_width = 10;
  let table_left_global = border_width + 5;
  let table_right_global = page_width - 2 * border_width - 10;

  // Draw the border rectangle
  doc
    .rect(
      border_width,
      border_height,
      page_width - 2 * border_width,
      page_height - 2 * border_height
    )
    .stroke();

  let content_depth = border_height + 30;

  // Add the title below the border at the top of the page
  let TITLE = "KRG Studios LLP";
  let text_width = doc.font("Helvetica-Bold").fontSize(30).widthOfString(TITLE);
  let text_height = doc
    .font("Helvetica-Bold")
    .fontSize(30)
    .currentLineHeight(TITLE);

  const drawAndWrite = (doc, font_size, text, options) => {
    let underline = false,
      table_left = table_left_global,
      table_right = table_right_global,
      rect_fill_color = "white",
      rect_stroke_color = "black",
      no_add_content_depth = false,
      text_height = doc.fontSize(font_size).currentLineHeight() - font_size / 5,
      text_width = doc.fontSize(font_size).widthOfString(text),
      text_align = "center",
      number_of_lines = 1,
      vertical_align = "top",
      text_align_height = content_depth + 5,
      minus_content_depth = 0,
      plus_padding = 0,
      plus_text_depth = 0,
      no_rect = false;

    if (options) {
      underline = options.underline || false;
      table_left = options.table_left || table_left;
      table_right = options.table_right || table_right;
      rect_fill_color = options.rect_fill_color || rect_fill_color;
      rect_stroke_color = options.rect_stroke_color || rect_stroke_color;
      no_add_content_depth =
        options.no_add_content_depth || no_add_content_depth;
      text_align = options.text_align || text_align;
      vertical_align = options.vertical_align || vertical_align;
      minus_content_depth = options.minus_content_depth || minus_content_depth;
      number_of_lines = options.number_of_lines || number_of_lines;
      plus_padding = options.plus_padding || plus_padding;
      plus_text_depth = options.plus_text_depth || plus_text_depth;
      no_rect = options.no_rect || no_rect;
    }

    let max_text_width = table_right - 10;

    if (text_width > max_text_width) {
      text_width = max_text_width;
    }

    let height = (text_height + 10) * number_of_lines + plus_padding;

    content_depth -= minus_content_depth * (text_height + 10);

    if (text_align === "center") {
      text_align = table_right / 2 - text_width / 2 + table_left;
    } else if (text_align === "left") {
      text_align = table_left + 5;
    }

    if (vertical_align === "center") {
      text_align_height = content_depth + height / 2 - text_height / 2;
    }

    text_align_height += plus_text_depth;

    if (!no_rect) {
      doc
        .rect(table_left, content_depth, table_right, height)
        .fillAndStroke(rect_fill_color, rect_stroke_color);
    }

    doc
      .fillColor("black")
      .fontSize(font_size)
      .text(text, text_align, text_align_height, {
        underline: underline,
        width: max_text_width,
      });
    if (!no_add_content_depth) {
      content_depth += height;
    }
  };

  doc
    .font("Helvetica-Bold")
    .fontSize(30)
    .text(TITLE, page_width / 2 - text_width / 2, content_depth);

  content_depth += text_height + 10;

  drawAndWrite(doc, 11, "TAX INVOICE", { rect_fill_color: "lightgrey" });
  drawAndWrite(doc, 11, "KRG STUDIOS LLP", { underline: true });

  doc.font("Helvetica");

  drawAndWrite(
    doc,
    9,
    "#178, 3rd Floor, 6th cross, Vajreshwari Building, Gandhinagar, Bangalore - 560 009"
  );
  drawAndWrite(doc, 11, "PAN NO :- AAWFK2822L", {
    table_right: table_right_global / 2,
    no_add_content_depth: true,
    text_align: "left",
  });
  drawAndWrite(doc, 11, "Ph : 9008073687", {
    table_left: table_right_global / 2 + 15,
    table_right: table_right_global / 2,
    text_align: "left",
  });
  drawAndWrite(doc, 11, "GST NO :- 29AAWFK2822L1ZN", {
    table_right: table_right_global / 2,
    no_add_content_depth: true,
    text_align: "left",
  });
  drawAndWrite(doc, 11, "HSN CODE: 997332", {
    table_left: table_right_global / 2 + 15,
    table_right: table_right_global / 2,
    text_align: "left",
  });

  doc.font("Helvetica-Bold");

  drawAndWrite(doc, 11, "RECIPIENTS DETAILS", { rect_fill_color: "lightgrey" });

  doc.font("Helvetica");

  drawAndWrite(doc, 11, "Party Name :- YYYY", { text_align: "left" });
  drawAndWrite(doc, 11, `Theatre Name :- ${eventBody.theatreName}`, {
    text_align: "left",
  });
  drawAndWrite(doc, 11, "Address :- ZZZZ", {
    text_align: "left",
    number_of_lines: 2,
  });
  drawAndWrite(doc, 11, "Party's GSTNo:- :- BBBB", { text_align: "left" });
  drawAndWrite(doc, 11, "STATE :- Karnataka", { text_align: "left" });
  drawAndWrite(doc, 11, "Circuit / Area:- KKKK", { text_align: "left" });
  drawAndWrite(doc, 11, "Tax Invoice No :- FEB/2023/2025", {
    text_align: "left",
  });
  drawAndWrite(doc, 11, "Tax Invoice Date :- 28/02/2023", {
    text_align: "left",
  });
  drawAndWrite(doc, 11, "Week :- 1", { text_align: "left" });
  drawAndWrite(doc, 11, "Run :- 1", { text_align: "left" });

  drawAndWrite(doc, 9, "Name OF The Movie", {
    number_of_lines: 2,
    table_right: (table_right_global * 5) / 20,
    no_add_content_depth: true,
    vertical_align: "center",
  });
  drawAndWrite(doc, 9, "Period of Run", {
    table_left: (table_right_global * 5) / 20 + 15,
    table_right: (table_right_global * 6) / 20,
    vertical_align: "center",
  });
  drawAndWrite(doc, 9, "From", {
    table_left: (table_right_global * 5) / 20 + 15,
    table_right: (table_right_global * 6) / 20 / 3,
    vertical_align: "center",
    no_add_content_depth: true,
  });
  drawAndWrite(doc, 9, "To", {
    table_left:
      (table_right_global * 5) / 20 + (table_right_global * 6) / 20 / 3 + 15,
    table_right: (table_right_global * 6) / 20 / 3,
    vertical_align: "center",
    no_add_content_depth: true,
  });
  drawAndWrite(doc, 9, "Shows", {
    table_left:
      (table_right_global * 5) / 20 + (table_right_global * 12) / 20 / 3 + 15,
    table_right: (table_right_global * 6) / 20 / 3,
    vertical_align: "center",
  });
  drawAndWrite(doc, 9, "Net Collections", {
    table_left: (table_right_global * 11) / 20 + 15,
    number_of_lines: 2,
    table_right: (table_right_global * 3) / 20,
    no_add_content_depth: true,
    vertical_align: "center",
    minus_content_depth: 2,
  });
  drawAndWrite(doc, 9, "Theatre Share", {
    table_left: (table_right_global * 14) / 20 + 15,
    number_of_lines: 2,
    table_right: (table_right_global * 3) / 20,
    no_add_content_depth: true,
    vertical_align: "center",
  });
  drawAndWrite(doc, 9, "Distributor Share", {
    table_left: (table_right_global * 17) / 20 + 15,
    number_of_lines: 2,
    table_right: (table_right_global * 3) / 20,
    vertical_align: "center",
  });

  drawAndWrite(doc, 9, eventBody.movieName, {
    number_of_lines: 6,
    table_right: (table_right_global * 5) / 20,
    no_add_content_depth: true,
    vertical_align: "center",
    text_align: "left",
  });
  drawAndWrite(doc, 9, runDateFrom, {
    number_of_lines: 6,
    table_left: (table_right_global * 5) / 20 + 15,
    table_right: (table_right_global * 6) / 20 / 3,
    vertical_align: "center",
    no_add_content_depth: true,
  });
  drawAndWrite(doc, 9, runDateTo, {
    number_of_lines: 6,
    table_left:
      (table_right_global * 5) / 20 + (table_right_global * 6) / 20 / 3 + 15,
    table_right: (table_right_global * 6) / 20 / 3,
    vertical_align: "center",
    no_add_content_depth: true,
  });
  drawAndWrite(doc, 9, `${eventBody.numberOfShows}`, {
    number_of_lines: 6,
    table_left:
      (table_right_global * 5) / 20 + (table_right_global * 12) / 20 / 3 + 15,
    table_right: (table_right_global * 6) / 20 / 3,
    vertical_align: "center",
  });
  drawAndWrite(doc, 9, `${eventBody.netCollection}`, {
    number_of_lines: 6,
    table_left: (table_right_global * 11) / 20 + 15,
    table_right: (table_right_global * 3) / 20,
    no_add_content_depth: true,
    vertical_align: "center",
    minus_content_depth: 6,
  });
  drawAndWrite(doc, 9, `${eventBody.theatreShare}`, {
    number_of_lines: 6,
    table_left: (table_right_global * 14) / 20 + 15,
    table_right: (table_right_global * 3) / 20,
    no_add_content_depth: true,
    vertical_align: "center",
  });
  drawAndWrite(doc, 9, `${eventBody.distributorShare}`, {
    number_of_lines: 6,
    table_left: (table_right_global * 17) / 20 + 15,
    table_right: (table_right_global * 3) / 20,
    vertical_align: "center",
  });

  let text = `Bank Details:
KRG Studios LLP
BANK:- HDFC Bank
A/c #- 50200055037942 IFSC Code :- HDFC0001208 Branch-: MillersRoad`;

  doc.font("Helvetica-Bold");

  drawAndWrite(doc, 11, text, {
    number_of_lines: 6,
    table_right: (table_right_global * 11) / 20,
    no_add_content_depth: true,
    vertical_align: "top",
    text_align: "left",
    plus_padding: 3.63,
    plus_text_depth: 30,
  });

  drawAndWrite(doc, 11, "Taxable Amount of Service", {
    number_of_lines: 1,
    table_left: (table_right_global * 11) / 20 + 15,
    table_right: (table_right_global * 6) / 20,
    no_add_content_depth: true,
    vertical_align: "top",
    text_align: "left",
  });
  drawAndWrite(doc, 11, `${eventBody.distributorShare}`, {
    number_of_lines: 1,
    table_left: (table_right_global * 17) / 20 + 15,
    table_right: (table_right_global * 3) / 20,
    vertical_align: "top",
    text_align: "left",
  });

  drawAndWrite(doc, 11, "SGST -: 9%", {
    number_of_lines: 1,
    table_left: (table_right_global * 11) / 20 + 15,
    table_right: (table_right_global * 6) / 20,
    no_add_content_depth: true,
    vertical_align: "top",
    text_align: "left",
  });
  drawAndWrite(
    doc,
    11,
    `${Math.round(parseFloat(eventBody.distributorShare) * 9) / 100}`,
    {
      number_of_lines: 1,
      table_left: (table_right_global * 17) / 20 + 15,
      table_right: (table_right_global * 3) / 20,
      vertical_align: "top",
      text_align: "left",
    }
  );

  drawAndWrite(doc, 11, "CGST -: 9%", {
    number_of_lines: 1,
    table_left: (table_right_global * 11) / 20 + 15,
    table_right: (table_right_global * 6) / 20,
    no_add_content_depth: true,
    vertical_align: "top",
    text_align: "left",
  });
  drawAndWrite(
    doc,
    11,
    `${Math.round(parseFloat(eventBody.distributorShare) * 9) / 100}`,
    {
      number_of_lines: 1,
      table_left: (table_right_global * 17) / 20 + 15,
      table_right: (table_right_global * 3) / 20,
      vertical_align: "top",
      text_align: "left",
    }
  );

  drawAndWrite(doc, 11, "Total Share", {
    number_of_lines: 1,
    table_left: (table_right_global * 11) / 20 + 15,
    table_right: (table_right_global * 6) / 20,
    no_add_content_depth: true,
    vertical_align: "top",
    text_align: "left",
  });
  drawAndWrite(
    doc,
    11,
    `${
      parseFloat(eventBody.distributorShare) +
      2 * (Math.round(parseFloat(eventBody.distributorShare) * 9) / 100)
    }`,
    {
      number_of_lines: 1,
      table_left: (table_right_global * 17) / 20 + 15,
      table_right: (table_right_global * 3) / 20,
      vertical_align: "top",
      text_align: "left",
    }
  );

  drawAndWrite(doc, 11, "Less-: Rep. Batta", {
    number_of_lines: 1,
    table_left: (table_right_global * 11) / 20 + 15,
    table_right: (table_right_global * 6) / 20,
    no_add_content_depth: true,
    vertical_align: "top",
    text_align: "left",
  });
  drawAndWrite(doc, 11, "", {
    number_of_lines: 1,
    table_left: (table_right_global * 17) / 20 + 15,
    table_right: (table_right_global * 3) / 20,
    vertical_align: "top",
    text_align: "left",
  });

  drawAndWrite(doc, 15, "Balance Payable", {
    number_of_lines: 1,
    table_left: (table_right_global * 11) / 20 + 15,
    table_right: (table_right_global * 6) / 20,
    no_add_content_depth: true,
    vertical_align: "top",
    text_align: "left",
    rect_fill_color: "lightgrey",
  });
  drawAndWrite(
    doc,
    15,
    `${
      parseFloat(eventBody.distributorShare) +
      2 * (Math.round(parseFloat(eventBody.distributorShare) * 9) / 100)
    }`,
    {
      number_of_lines: 1,
      table_left: (table_right_global * 17) / 20 + 15,
      table_right: (table_right_global * 3) / 20,
      vertical_align: "top",
      text_align: "left",
      rect_fill_color: "lightgrey",
    }
  );

  drawAndWrite(doc, 12, "Balance Payable In Words :-", {
    rect_fill_color: "lightgrey",
    text_align: "left",
    number_of_lines: 2,
  });

  doc.font("Helvetica");

  drawAndWrite(
    doc,
    9,
    "> Payments to be made by Cheque /RTGS/NEFT /DD in favor of KRG STUDIOS LLP",
    { text_align: "left", no_rect: true }
  );
  drawAndWrite(
    doc,
    9,
    "> Any Discrepancy in the Invoice has to be intimated to us within 7 days",
    { text_align: "left", no_rect: true }
  );
  drawAndWrite(
    doc,
    9,
    "> Interest @ 18%p.a Will be charged on all bills remaining unpaid within 14days.",
    { text_align: "left", no_rect: true }
  );

  doc.font("Helvetica-Bold");

  // doc.pipe(fs.createWriteStream('border.pdf'));
  // doc.end();

  const buffer = await new Promise((resolve, reject) => {
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.end();
  });

  // push it to s3
  const fileKey = `invoices/invoice_${uuidV4()}.pdf`;
  const s3 = new S3Client({ region: "ap-south-1" });
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: fileKey,
    Body: buffer,
    ContentType: "application/pdf",
  };

  const command = new PutObjectCommand(params);

  const data = await s3.send(command);
  console.log("data", JSON.stringify(data, null, 2));

  // put this data to dynamodb

  const client = new DynamoDBClient({ region: "ap-south-1" });
  const dynamodbClient = DynamoDBDocumentClient.from(client);
  const putParams = {
    TableName: process.env.KRG_TABLE,
    Item: {
      id: fileKey.split(".")[0].split("_")[1],
      movieName: eventBody.movieName,
      theatreName: eventBody.theatreName,
      runDateFrom: runDateFrom,
      runDateTo: runDateTo,
      numberOfShows: eventBody.numberOfShows,
      netCollection: eventBody.netCollection,
      theatreShare: eventBody.theatreShare,
      distributorShare: eventBody.distributorShare,
      status: "notSubmitted",
      createdAt: new Date().toISOString(),
      signerDetails: {
        name: "",
        email: "",
        date: "",
      },
    },
  };

  const putCommand = new PutCommand(putParams);
  await dynamodbClient.send(putCommand);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Success",
      data: {
        fileKey: fileKey,
      },
      s3Response: data,
    }),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
    },
  };
};

// import event from "./event.json" assert { type: "json" };
// process.env.BUCKET_NAME = "krg-krgbucket-ggbsrrp08wf0";
// process.env.KRG_TABLE = "krg-krgTable-C76XBZ09S3CB";
// handler({
//   body: JSON.stringify(event),
// });
