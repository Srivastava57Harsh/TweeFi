"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Wallet, ExternalLink, Copy, Check } from "lucide-react";

interface TwitterProfile {
  data: {
    id: string;
    name: string;
    username: string;
    description?: string;
    profile_image_url?: string;
    public_metrics?: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
    };
    verified?: boolean;
  };
}

export default function SuccessPage() {
  const { tokenId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<TwitterProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aptosAccount, setAptosAccount] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isTweeting, setIsTweeting] = useState(false);
  const [tweetUrl, setTweetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchTwitterProfile = async () => {
      try {
        const token = searchParams.get("token");
        if (!token) {
          throw new Error("No token provided");
        }
        // Store token in session storage
        sessionStorage.setItem("twitter_token", token);

        const response = await fetch(
          "/api/auth/twitter/success?token=" + token
        );

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        setProfile(data.profile);

        // If user already has a wallet, set it
        if (data.wallet) {
          setAptosAccount(data.wallet);
        }
      } catch (err) {
        sessionStorage.removeItem("twitter_token");
        setError(err instanceof Error ? err.message : "Something went wrong");
        router.push(`/claim/${tokenId}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTwitterProfile();
  }, [searchParams, router, tokenId]);

  const handleCreateAptosAccount = async () => {
    if (!profile) return;
    setIsCreatingAccount(true);
    try {
      const token = searchParams.get("token");
      if (!token) {
        throw new Error("No token provided");
      }

      // Call the API endpoint to create an Aptos account
      const response = await fetch("/api/auth/twitter/createAptosAccount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: token,
          profile: profile,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create wallet");
      }

      const { address } = await response.json();
      setAptosAccount(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create wallet");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleTweet = async () => {
    if (!aptosAccount || !profile) return;
    setIsTweeting(true);
    try {
      const token = searchParams.get("token");
      if (!token) {
        throw new Error("No token provided");
      }

      const response = await fetch("/api/auth/twitter/tweetCard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token ?? "",
        },
        body: JSON.stringify({
          account: aptosAccount,
        }),
      });

      if (!response.ok) throw new Error("Failed to send tweet");
      const data = await response.json();
      setTweetUrl(data.tweetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send tweet");
    } finally {
      setIsTweeting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };

  // Show loading state for the entire card when creating account
  if (isCreatingAccount) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[500px] bg-black">
        <Card className="w-full max-w-[400px] border-0 bg-zinc-900 shadow-xl">
          <CardContent className="pt-6 pb-6">
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-lg">TF</span>
              </div>
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Creating Your Wallet
              </h3>
              <p className="text-zinc-400 text-sm">
                Setting up your Aptos account...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[500px] bg-black">
      {!aptosAccount && (
        <Card className="w-full max-w-[400px] border-0 bg-zinc-900 shadow-xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          <CardHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-center mb-2">
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">TF</span>
              </div>
            </div>
            <CardTitle className="text-center text-white">
              Authentication Success
            </CardTitle>
            <CardDescription className="text-center text-blue-400">
              {tokenId === "login"
                ? "Login successful, you can now close the window!"
                : "Create your Aptos wallet to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {error ? (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-center text-sm">
                {error}
              </div>
            ) : isLoading ? (
              <Card className="border border-zinc-800 shadow-sm bg-zinc-900">
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="text-sm text-center text-zinc-400">
                      Loading your profile details...
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full bg-zinc-800" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[180px] bg-zinc-800" />
                          <Skeleton className="h-4 w-[140px] bg-zinc-800" />
                        </div>
                      </div>
                      <Skeleton className="h-16 w-full bg-zinc-800" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : profile ? (
              <Card className="border border-zinc-800 shadow-sm bg-zinc-900">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      {profile.data.profile_image_url && (
                        <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-zinc-700">
                          <Image
                            src={
                              profile.data.profile_image_url ||
                              "/placeholder.svg"
                            }
                            alt={profile.data.name}
                            className="object-cover"
                            fill
                            sizes="48px"
                          />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-white flex items-center gap-1">
                          {profile.data.name}
                          {profile.data.verified && (
                            <span className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full h-4 w-4">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-zinc-400">
                          @{profile.data.username}
                        </div>
                      </div>
                    </div>
                    {profile.data.description && (
                      <p className="text-xs text-zinc-300 border-t border-b border-zinc-800 py-2">
                        {profile.data.description}
                      </p>
                    )}
                    {profile.data.public_metrics && (
                      <div className="flex justify-between text-xs text-zinc-400 bg-zinc-800/50 p-2 rounded-lg">
                        <div className="flex flex-col items-center">
                          <span className="font-semibold text-white">
                            {profile.data.public_metrics.followers_count.toLocaleString()}
                          </span>
                          <span className="text-[10px]">Followers</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="font-semibold text-white">
                            {profile.data.public_metrics.following_count.toLocaleString()}
                          </span>
                          <span className="text-[10px]">Following</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="font-semibold text-white">
                            {profile.data.public_metrics.tweet_count.toLocaleString()}
                          </span>
                          <span className="text-[10px]">Posts</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </CardContent>
          {profile && tokenId !== "login" && (
            <CardFooter className="flex justify-center pb-4">
              <Button
                onClick={handleCreateAptosAccount}
                disabled={isCreatingAccount}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg shadow-blue-900/20 border border-blue-700/20 transition-all duration-200"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Create Aptos Wallet
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {aptosAccount && (
        <Card className="w-full max-w-[400px] border-0 bg-zinc-900 shadow-xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          <CardHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-center mb-2">
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">TF</span>
              </div>
            </div>
            <CardTitle className="text-center text-white">
              Wallet Created!
            </CardTitle>
            <CardDescription className="text-center text-blue-400">
              Your Aptos account is ready to use
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-3">
                <div className="flex flex-col space-y-2">
                  <div className="text-xs text-zinc-400 font-medium">
                    Aptos Account Address:
                  </div>
                  <div className="flex items-center justify-between bg-zinc-900 p-2 rounded-lg border border-zinc-700">
                    <div className="text-xs text-zinc-300 font-mono">
                      {truncateAddress(aptosAccount)}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => copyToClipboard(aptosAccount)}
                        className="p-1 rounded-md hover:bg-zinc-800 transition-colors"
                        title="Copy address"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-green-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-zinc-400" />
                        )}
                      </button>
                      <a
                        href={`https://explorer.aptoslabs.com/account/${aptosAccount}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-md hover:bg-zinc-800 transition-colors"
                        title="View on explorer"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                      </a>
                    </div>
                  </div>

                  {!tweetUrl ? (
                    <Button
                      onClick={handleTweet}
                      disabled={isTweeting}
                      className="mt-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg shadow-blue-900/20 border border-blue-700/20 transition-all duration-200"
                    >
                      {isTweeting ? (
                        <div className="flex items-center space-x-2 py-0.5">
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span className="text-sm">Posting...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 py-0.5">
                          <span className="text-sm">Share on X</span>
                        </div>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-2 mt-2">
                      <div className="text-xs text-green-400 bg-green-900/30 p-2 rounded-lg border border-green-800/50 flex items-center">
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Post sent successfully!
                      </div>
                      <Button
                        onClick={() => window.open(tweetUrl, "_blank")}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg shadow-blue-900/20 border border-blue-700/20 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-2 py-0.5">
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="text-sm">View Post</span>
                        </div>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-zinc-800 pt-2 pb-3 flex justify-center">
            <p className="text-[10px] text-zinc-500 text-center max-w-xs">
              Your wallet is now connected to your account. You can use TweeFi
              to interact with your Aptos wallet directly from X.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
