// import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { auth0 } from "@/lib/auth0";
import CalendarEvents from "./calendar-events";

export const dynamic = 'force-dynamic';

/**
 * Main Screen
 * 
 * @returns 
 */
export default async function Home() {
  const session = await auth0.getSession();
  
  if (session === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              Tokens for APIs Demo
            </CardTitle>
            <CardDescription className="pt-2">
              This is a sample application that demonstrates how Auth0 can help securely call other apis like Google.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              You&apos;ll be redirected to Google to connect your Calendar, once that is done we will show
              you your calendar events for today.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button size="lg" className="w-full" asChild>
              <a href="/auth/login">
                Login to get Started
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return <CalendarEvents />
}
