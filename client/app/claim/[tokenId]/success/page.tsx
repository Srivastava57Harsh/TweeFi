"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";

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
  const { tokenId } = useParams(); //basically being used as an action handler, can be signup or login
  const searchParams = useSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<TwitterProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aptosAccount, setAptosAccount] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isTweeting, setIsTweeting] = useState(false);
  const [tweetUrl, setTweetUrl] = useState<string | null>(null);

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
  }, [searchParams]);

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

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4 space-y-4">
      {!aptosAccount && (
        <Card className="w-full max-w-md bg-white border-gray-200">
          <CardHeader className="bg-white">
            <CardTitle>Twitter Authentication Success</CardTitle>
            <CardDescription>
              {tokenId === "login"
                ? "Login successful, you can now close the window!"
                : "Create your Aptos wallet to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white">
            {error ? (
              <div className="text-red-500">{error}</div>
            ) : isLoading ? (
              <Card className="border-2 bg-white">
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="text-sm text-center text-gray-500">
                      Loading your profile details...
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-4 w-[150px]" />
                        </div>
                      </div>
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : profile ? (
              <Card className="border-2 bg-white">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      {profile.data.profile_image_url && (
                        <Image
                          src={profile.data.profile_image_url}
                          alt={profile.data.name}
                          className="h-12 w-12 rounded-full"
                          width={100}
                          height={100}
                        />
                      )}
                      <div>
                        <div className="font-medium">{profile.data.name}</div>
                        <div className="text-sm text-gray-500">
                          @{profile.data.username}
                        </div>
                      </div>
                    </div>
                    {profile.data.description && (
                      <p className="text-sm text-gray-700">
                        {profile.data.description}
                      </p>
                    )}
                    {profile.data.public_metrics && (
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>
                          {profile.data.public_metrics.followers_count}{" "}
                          followers
                        </span>
                        <span>
                          {profile.data.public_metrics.following_count}{" "}
                          following
                        </span>
                        <span>
                          {profile.data.public_metrics.tweet_count} tweets
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </CardContent>
        </Card>
      )}

      {profile && !aptosAccount && (
        <>
          {tokenId === "login" ? (
            <Button
              disabled={true}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-green-500 disabled:opacity-100"
            >
              Login Successful
            </Button>
          ) : (
            <Button
              onClick={handleCreateAptosAccount}
              disabled={isCreatingAccount}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isCreatingAccount
                ? "Creating Account..."
                : "Create Aptos Account"}
            </Button>
          )}
        </>
      )}

      {isCreatingAccount && (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Skeleton className="h-6 w-[300px] mx-auto" />
              <p className="mt-2 text-gray-500">
                Creating your Aptos account...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {aptosAccount && (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                <div className="flex flex-col space-y-2 text-center">
                  <div className="text-xl">
                    🎊 Wallet Created Successfully! 🎊
                  </div>
                  <div className="text-sm text-gray-700 font-semibold mt-2">
                    Aptos Account Address:
                  </div>
                  <div className="break-all text-sm">
                    <a
                      href={`https://explorer.aptoslabs.com/account/${aptosAccount}?network=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {aptosAccount}
                    </a>
                  </div>

                  {!tweetUrl ? (
                    <Button
                      onClick={handleTweet}
                      disabled={isTweeting}
                      className="mt-4 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white"
                    >
                      {isTweeting ? (
                        <div className="flex items-center space-x-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Sending Tweet...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <svg
                            className="h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                          </svg>
                          <span>Share on Twitter</span>
                        </div>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => window.open(tweetUrl, "_blank")}
                      className="mt-4 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white"
                    >
                      <div className="flex items-center space-x-2">
                        <svg
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                        </svg>
                        <span>View Tweet</span>
                      </div>
                    </Button>
                  )}
                  {tweetUrl && (
                    <div className="text-sm text-green-500 mt-2">
                      🎉 Tweet sent successfully!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
