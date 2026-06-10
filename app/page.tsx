import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: courses } = await supabase
      .from("courses")
      .select("id")
      .eq("creator_id", user.id)
      .limit(1);
    redirect(courses && courses.length > 0 ? "/dashboard" : "/onboarding");
  }

  redirect("/login");
}
