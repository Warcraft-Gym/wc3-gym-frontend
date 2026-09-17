"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Note } from "@/components/ui/Note";
import { useAuth } from "@/stores";

/** The admin-token login: a super admin session with no Discord account. */
export function AdminLoginView() {
  const { login } = useAuth();
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
      await login(password);
    } catch (error) {
      setApiError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[500px] gap-0 p-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex items-center gap-2 text-on-primary">
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
