import type { Metadata } from "next";
import { WhoWeArePage } from "../WhoWeArePage";

export const metadata: Metadata = {
  title: "Quiénes somos | Neuvra AI",
};

export default function Page() {
  return <WhoWeArePage />;
}
