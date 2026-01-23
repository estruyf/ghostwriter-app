import type { APIRoute } from "astro";
import { CopilotClient } from "@github/copilot-sdk";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const client = new CopilotClient();
    await client.createSession({
      model: "gpt-4.1",
    });
    const allModels = await client.listModels();

    // Filter only enabled models
    const enabledModels = allModels.filter(
      (model: any) => model.policy?.state === "enabled",
    );

    // Separate free and premium models
    const freeModels = enabledModels.filter(
      (model: any) => !model.billing?.is_premium,
    );
    const premiumModels = enabledModels.filter(
      (model: any) => model.billing?.is_premium,
    );

    // Sort each group by name
    freeModels.sort((a: any, b: any) => a.name.localeCompare(b.name));
    premiumModels.sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Combine with free models first
    const sortedModels = [...freeModels, ...premiumModels];

    // Map to simpler format
    const models = sortedModels.map((model: any) => ({
      id: model.id,
      name: model.name,
      isPremium: model.billing?.is_premium || false,
      multiplier: model.billing?.multiplier || 0,
    }));

    return new Response(JSON.stringify(models), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Failed to list models:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch models" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
