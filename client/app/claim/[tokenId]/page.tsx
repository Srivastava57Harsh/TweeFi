"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useParams, useRouter } from "next/navigation";
import { TwitterLogin } from "@/app/_components/TwitterLogin";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClaimPage() {
  const { tokenId } = useParams();
  const router = useRouter();
  const [hostname, setHostname] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      setHostname(window.location.origin);
      // Check if token exists in session storage
      const token = sessionStorage.getItem("twitter_token");
      if (token) {
        // Redirect to success page if token exists
        router.push(`/claim/${tokenId}/success?token=${token}`);
      } else {
        setIsChecking(false);
      }
    };
    init();
  }, [tokenId, router]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[500px] bg-black">
        <Card className="w-full max-w-[400px] border-0 bg-zinc-900 shadow-xl">
          <CardHeader className="space-y-2 border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-center mb-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold">TF</span>
              </div>
            </div>
            <Skeleton className="h-6 w-[180px] mx-auto mb-2 bg-zinc-800" />
            <Skeleton className="h-4 w-[140px] mx-auto bg-zinc-800" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-full bg-zinc-800" />
              <div className="flex flex-col items-center justify-center space-y-3 py-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
                <div className="text-sm text-zinc-400">
                  Loading your experience...
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[500px] bg-black">
      <Card className="w-full max-w-[400px] border-0 bg-zinc-900 shadow-xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        <CardHeader className="space-y-2 border-b border-zinc-800 pb-4">
          <div className="flex items-center justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">TF</span>
            </div>
          </div>
          <CardTitle className="text-center text-xl text-white">
            {tokenId === "signup" ? "Create" : "Login to"} Your TweeFi Account
          </CardTitle>
          <CardDescription className="text-center text-blue-400">
            Authenticate to get started!
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <TwitterLogin
            successUri={
              hostname
                ? `${hostname}/claim/${tokenId}/success`
                : `${process.env.NEXT_PUBLIC_HOSTNAME}/claim/${tokenId}/success`
            }
          />
          <div className="mt-4 text-center text-xs text-zinc-500">
            By connecting your account, you will be able to interact with TweeFi
            features
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
