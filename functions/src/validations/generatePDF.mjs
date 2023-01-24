import * as yup from "yup";

export const generatePDFBody = yup.object().shape({
  UserId: yup.string().required(),
  Email: yup.string().required(),
});
