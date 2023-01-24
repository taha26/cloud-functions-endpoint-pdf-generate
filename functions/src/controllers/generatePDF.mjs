import * as functions from "firebase-functions";
import HttpStatusCodes from "../declarations/HttpStatusCodes.mjs";
import firebaseAdmin from "../services/firebase-admin.mjs";
import { generatePDFBody } from "../validations/generatePDF.mjs";
import PDFGenerator from "pdfkit";
import nodemailer from "nodemailer";
import fs from "fs";

/**
 * @param {IReq} req
 * @param {IRes} res
 * @param {NextFunction} next
 */
export async function generatePDF(req, res, next) {
  try {
    const { body } = req;
    await generatePDFBody.validate(body);

    const { UserId, Email } = body;

    const user = await firebaseAdmin.getUserDocument(UserId);

    const { customerID, name } = user.data();

    if (!user.exists) {
      res.status(HttpStatusCodes.NOT_FOUND).send("User does not exist");
      return;
    }

    const userData = await firebaseAdmin.getUserData(UserId);

    const charityData = [];

    const asyncLoop = (userData) => {
      return new Promise((res, rej) => {
        userData.forEach(async (doc) => {
          const { portfolioSnapshot } = doc.data();
          const id = Object.keys(portfolioSnapshot).toString();
          const userCharityData = await firebaseAdmin.getUserCharity(id);
          const completeData = {
            amount: portfolioSnapshot[id],
            ...userCharityData.data(),
          };
          charityData.push(completeData);
          if (userData.size === charityData.length) {
            res();
          }
        });
      });
    };

    await asyncLoop(userData);

    let TOTAL_DONATION_AMOUNT = 0;

    for (let index = 0; index < charityData.length; index++) {
      TOTAL_DONATION_AMOUNT += charityData[index].amount;
    }
    const pdf = new PDFGenerator({ margin: 50 });

    const generate = async () => {
      const buffers = [];

      pdf.on("data", buffers.push.bind(buffers));
      pdf.on("end", async () => {
        const pdfData = Buffer.concat(buffers);
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          service: "gmail",
          auth: {
            user: "application.dev.acc.01@gmail.com",
            pass: "jckzbphfdtkbffgg",
          },
        });

        // send mail with defined transport object
        const info = await transporter.sendMail({
          from: "application.dev.acc.01@gmail.com", // sender address
          to: Email, // list of receivers
          subject: "Hello ✔", // Subject line
          text: "Hello world?", // plain text body
          attachments: [
            {
              filename: `donations-${customerID}.pdf`,
              content: pdfData,
            },
          ],
        });

        console.log("Message sent: %s", info.response);
      });

      pdf
        .text("End of year donation letter:", 100, 150)
        .moveDown()
        .text(`Date: ${new Date(Date.now())}`)
        .moveDown()
        .text(`Dear ${name},`)
        .moveDown()
        .text(
          `Thank you for your donation(s) of ${TOTAL_DONATION_AMOUNT} through Lasting Change Inc. between the dates of 1/1/2022-12/31/2022. As you may know, Lasting Change Inc. was organized to support other 501(c)(3) organizations on behalf of our donors.`
        )
        .moveDown()
        .text("Charity Name", 100, 310)
        .text("EIN", 250, 310)
        .text("Amount Donated", 380, 310)
        .moveDown();
      // .moveDown();

      function generateTableRow(pdf, y, c1, c2, c3) {
        pdf

          // .moveDown()
          .text(c1, 100, y)
          .text(c2, 250, y)
          .text(c3, 380, y, { width: 90, align: "right" })
          .moveDown();
      }

      async function generateTable(pdf, charityData) {
        let i,
          TableTop = 330;

        for (i = 0; i < charityData.length; i++) {
          const item = charityData[i];
          const position = TableTop + (i + 1) * 30;
          generateTableRow(
            pdf,
            position,
            item.name,
            item.EIN_Number,
            item.amount
          );
        }
      }
      generateTable(pdf, charityData);
      pdf
        .moveDown()
        .text(
          `Lasting Chance Inc. is a 501(c)(3) organization. Your contribution is tax deductible to the extent allowed by the law. No goods or services were provided in exchange for your generous donations.
    `,
          100
        )
        .moveDown()
        .text(
          `Again, thank you for your support.
    `
        )
        .moveDown()
        .text(`Sincerely`)
        .moveDown()
        .text(
          `Lasting Change Inc.
    `
        )
        .moveDown()
        .text(`EIN: 86-1995653`)
        .moveDown()
        .end();
    };

    generate();

    res.status(HttpStatusCodes.OK).send(`Email sent to ${Email}`);
  } catch (error) {
    functions.logger.error(error, { structuredData: true });
    next(error);
  }
}
