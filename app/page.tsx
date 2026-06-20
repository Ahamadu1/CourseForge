import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingPage from "./LandingPage";

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

    // Users with courses go straight to dashboard; new users see landing with logged-in CTAs
    if (courses && courses.length > 0) {
      redirect("/dashboard");
    }

    return <LandingPage isLoggedIn={true} />;
  }

  return <LandingPage isLoggedIn={false} />;
}
