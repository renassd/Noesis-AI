import type { Metadata } from "next";
import { WhoWeArePage } from "../WhoWeArePage";

export const metadata: Metadata = {
  title: "Who We Are | Neuvra AI",
};

export default function Page() {
  return <WhoWeArePage />;
}
