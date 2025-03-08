import axios from "axios";

export const getAIRecommendation = async (text: string, chatId: string): Promise<string> => {
  try {
    const { data } = await axios.post(`${process.env.AI_API_URL}/v1/invoke`, {
      message: text,
      threadId: chatId,
    });
    return data.message;
  } catch (err) {
    console.error('❌ Failed to get AI recommendation:', err);
    return "Sorry, I'm having trouble understanding right now. Please try again later!";
  }
};
