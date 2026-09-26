import React from "react";
import Spinner from "./Spinner";
import BrandLogo from "./BrandLogo";
import { APP_NAME } from "../../config/brand";

const StartupScreen = ({ message = `Starting ${APP_NAME} server...` }) => (
  <div className="flex flex-col items-center justify-center h-screen">
    <BrandLogo className="w-24 h-24 mb-6" />
    <p className="text-xl mb-4">{message}</p>
    <Spinner />
  </div>
);

export default StartupScreen;
