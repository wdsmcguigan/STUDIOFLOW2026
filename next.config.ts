import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude the legacy v0 prototype from TypeScript and webpack processing
  typescript: {
    // legacy/ is excluded in tsconfig.json; ignore any residual errors from it
    ignoreBuildErrors: false,
  },
};

export default withWorkflow(nextConfig);
