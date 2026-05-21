"use server";

import { loginAction, signupAction, type AuthActionState } from "@/lib/auth";

export async function loginFormAction(previousState: AuthActionState, formData: FormData) {
  return loginAction(previousState, formData);
}

export async function signupFormAction(previousState: AuthActionState, formData: FormData) {
  return signupAction(previousState, formData);
}
