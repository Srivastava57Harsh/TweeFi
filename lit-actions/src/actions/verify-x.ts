/// <reference path="../global.d.ts" />

interface TwitterGetMeResponse {
  data: {
    id: string;
    name: string;
    username: string;
  };
}
const verifyXToken = async (_accessToken: string): Promise<string> => {
  try {
    const response = await fetch("https://api.twitter.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${_accessToken}`,
      },
    });
    if (response.ok) {
      const res = (await response.json()) as TwitterGetMeResponse;
      console.log("Response from Twitter API:", res);
      return res?.data?.id ?? "";
    }
    console.error("Error authenticating user", response);
    return "";
  } catch (error) {
    console.error("Error authenticating user", error);
    return "";
  }
};
