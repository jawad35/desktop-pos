import "dotenv/config"; // <-- loads .env automatically
import { v2 as cloudinary } from "cloudinary";
console.log(process.env.CLOUDINARY_CLOUD_NAME,'90')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
