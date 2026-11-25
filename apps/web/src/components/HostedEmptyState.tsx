import { Link, useRouter } from "@tanstack/react-router";
import { T } from "gt-react";

import { isLocalEnvironmentDisabled } from "../localEnvironment";
import { HostedHostConnectionCard } from "./auth/PairingRouteSurface";
import { Button } from "./ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "./ui/empty";
import { SidebarInset } from "./ui/sidebar";

export function HostedEmptyState() {
  const localEnvironmentOff = isLocalEnvironmentDisabled();
  const router = useRouter();

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none">
      <div className="flex min-h-0 min-w-0 flex-1 items-center-safe justify-center overflow-y-auto scrollbar-gutter-both bg-background px-4 py-10">
        {localEnvironmentOff ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                <T>This computer is off</T>
              </EmptyTitle>
              <EmptyDescription>
                <T>Turn it back on, or connect a different computer.</T>
              </EmptyDescription>
            </EmptyHeader>
            <Button render={<Link to="/settings/connections" />} size="sm-pill">
              <T>Open Environments</T>
            </Button>
          </Empty>
        ) : (
          <HostedHostConnectionCard onConnected={() => void router.invalidate()} />
        )}
      </div>
    </SidebarInset>
  );
}
