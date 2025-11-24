import { fetchArticles } from "@/lib/news";
import { inngest } from "../client";
import { marked } from "marked";
import { sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export const scheduledNewsletter = inngest.createFunction(
    { id: "newsletter/scheduled", cancelOn: [{
        event: "newsletter.schedule.deleted",
        if: "async.data.userId == event.data.userId",
    }] },
    { event: "newsletter.schedule" },
    async ({ event, step, runId }) => {

        const isUserActive = await step.run("check-user-status", async () => {
            const supabase = await createClient();
            const { data, error } = await supabase
            .from("user_preferences")
            .select("is_active")
            .eq("user_id", event.data.userId)
            .single();

            if(error) {
                return false;
            }

            return data.is_active || false;

        });

        if (!isUserActive){
            return{};
        }

        const categories = event.data.categories;
        const allArticles = await step.run("fetch-news", async () => {
            return fetchArticles(categories);
        });

        // Generate ai summary
        const summary = await step.ai.infer("summarize-news", {
            model: step.ai.models.openai({model: "gpt-4o-mini"}),
            body: {
                messages: [
                    {
                        role: "system",
                        content: `You are an expert newsletter editor... (rest of your prompt) ...`,
                    },
                    {
                        role: "user",
                        content: `Create a newsletter summary for these articles from the past week. 
                        Categories requested: ${categories.join(", ")}
              
                        Articles:
                        ${allArticles
                            .map(
                                (article: any, index: number) =>
                                `${index + 1}. ${article.title}\n   ${
                                    article.description
                                }\n   Source: ${article.url}\n`
                            )
                            .join("\n")}`,
                    },
                ],
            },
        });

        const newsletterContent = summary.choices[0].message.content;

        if(!newsletterContent) {
            throw new Error("Failed to generate newsletter content");
        }

        const htmlResult = await marked(newsletterContent);
        
        await step.run("send-email", async() => {
            await sendEmail(event.data.email, 
            event.data.categories.join(", "), 
            allArticles.length,
            htmlResult
        );
        })

        await step.run("schedule-next", async () => {
            const now = new Date()
            let nextScheduleTime: Date;

            switch (event.data.frequency) {
                case "daily":
                    nextScheduleTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    break;
                case "weekly":
                    nextScheduleTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    break;
                case "biweekly":
                    nextScheduleTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    nextScheduleTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            }

            nextScheduleTime.setHours(9, 0, 0, 0);

            await inngest.send({
                name: "newsletter.schedule",
                data: {
                    categories,
                    email: event.data.email,
                    frequency: event.data.frequency,
                    userId: event.data.userId,
                },
                ts: nextScheduleTime.getTime(),
            })
        })
        return {newsletter: htmlResult, 
            articleCount: allArticles.length, 
            nextScheduled: true,};
    }
);