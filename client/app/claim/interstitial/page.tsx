"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function InterstitialPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const successUri = searchParams.get("successUri");

    console.log(successUri);

    // Send message to opener window if it exists
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "TWITTER_AUTH_SUCCESS",
          successUri,
        },
        "*"
      );
      if (successUri) {
        window.close();
      }
    } else {
      // Direct navigation - store token and redirect if successUri exists
      sessionStorage.setItem("success_auth", successUri || "");
      if (successUri) {
        window.location.href = successUri;
      }
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[500px] bg-black">
      <div className="text-center bg-zinc-900 p-6 rounded-xl shadow-xl border border-zinc-800 max-w-sm w-full">
        <div className="flex justify-center mb-6">
          <div className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">TF</span>
          </div>
        </div>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          Authentication in Progress
        </h3>
        <p className="text-sm text-zinc-400">
          We are securely connecting your account...
        </p>
      </div>
    </div>
  );
}
