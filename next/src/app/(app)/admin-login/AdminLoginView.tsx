"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Note } from "@/components/ui/Note";
import { useAuth } from "@/stores";
import { DevLoginCard, devLoginEnabled } from "@/components/DevLoginCard";

/** Once the admin token is in, with the local dev login on: go on as the super admin, or sign in as a player. */
function ContinueAs() {
  const { continueAsAdmin } = useAuth();
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[500px] gap-0 p-0">
        <CardHeader className="banner bg-banner p-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Icon name="mdi-shield-account" />
            Continue as
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Button size="lg" className="h-11 w-full text-base" onClick={continueAsAdmin}>
            <Icon name="mdi-shield-crown" />
            Continue as Super Admin
          </Button>
        </CardContent>
      </Card>
      <DevLoginCard />
    </div>
  );
}

/** The admin-token login: a super admin session with no Discord account. With the local dev login on,
 *  the accepted token leads to a choice instead of the app, and survives a reload of this page. */
export function AdminLoginView() {
  const { login, user, me } = useAuth();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(password ? null : "Password is required");
    if (!password) return;

    setIsSubmitting(true);
    try {
      await login(password, { stay: devLoginEnabled });
    } catch (error) {
      setApiError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // the admin token's session, not a dev login that sits in the same slot
  if (devLoginEnabled && user && !user.dev && me?.superadmin) return <ContinueAs />;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[500px] gap-0 p-0">
        <CardHeader className="banner bg-banner p-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Icon name="mdi-lock" />
            Admin token login
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <form noValidate onSubmit={onSubmit}>
            <Field label="Admin token" htmlFor="admin-token" error={passwordError}>
              <InputGroup>
                <InputGroupAddon>
                  <Icon name="mdi-lock-outline" />
                </InputGroupAddon>
                <InputGroupInput
                  id="admin-token"
                  name="password"
                  type="password"
                  value={password}
                  aria-invalid={!!passwordError}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setPasswordError(event.target.value ? null : "Password is required");
                  }}
                />
              </InputGroup>
            </Field>

            <Button type="submit" size="lg" className="mt-4 h-11 w-full" disabled={isSubmitting}>
              <Icon name={isSubmitting ? "mdi-loading" : "mdi-login"} className={isSubmitting ? "animate-spin" : undefined} />
              Log in
            </Button>

            {apiError ? (
              <Note type="error" className="mt-4">
                {apiError}
              </Note>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminLoginView;
