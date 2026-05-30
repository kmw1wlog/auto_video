export type KieCreateTaskResult = {
  taskId?: string;
  recordId?: string;
  raw: unknown;
};

export async function createKieMarketTask(input: {
  model: string;
  taskInput: Record<string, unknown>;
}): Promise<KieCreateTaskResult> {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    throw new Error("KIE_API_KEY가 설정되지 않았습니다.");
  }

  const response = await fetch(process.env.KIE_CREATE_TASK_URL ?? "https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: input.model,
      callBackUrl: process.env.KIE_CALLBACK_URL || undefined,
      input: input.taskInput
    })
  });
  if (!response.ok) {
    throw new Error(`Kie createTask HTTP ${response.status}`);
  }
  const raw = await response.json() as { data?: { taskId?: string; recordId?: string } };
  return {
    taskId: raw.data?.taskId,
    recordId: raw.data?.recordId,
    raw
  };
}

export async function createKieMascotMotionTask(): Promise<KieCreateTaskResult> {
  return createKieMarketTask({
    model: process.env.KIE_KLING_IMAGE_TO_VIDEO_MODEL ?? "kling-2.6/image-to-video",
    taskInput: {
      prompt: "Sticker-style mascot detective pops in, points at a headline card, nods once, then exits. Clean motion, social media transition, no sound.",
      image_urls: [process.env.MASCOT_SOURCE_IMAGE_URL].filter(Boolean),
      sound: false,
      duration: "5"
    }
  });
}
