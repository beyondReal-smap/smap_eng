import { z } from "zod";

/**
 * 로그인/회원가입 폼 스키마.
 * Next.js 16 Server Actions + useActionState 패턴에서 safeParse로 검증.
 */

export const LoginSchema = z.object({
  email: z
    .string({ error: "이메일을 입력해 주세요." })
    .trim()
    .min(1, { error: "이메일을 입력해 주세요." })
    .email({ error: "올바른 이메일 형식이 아닙니다." }),
  password: z
    .string({ error: "비밀번호를 입력해 주세요." })
    .min(1, { error: "비밀번호를 입력해 주세요." }),
});

/**
 * "필수 동의 체크박스" 헬퍼.
 * HTML form의 미체크 체크박스는 FormData에 키 자체가 없거나 빈 문자열로 도착하므로,
 * 체크 시에만 들어오는 "on"/"true"/true 를 허용하고 그 외는 거절한다.
 */
const requiredAgreement = (msg: string) =>
  z
    .union([z.literal("on"), z.literal("true"), z.literal(true)])
    .optional()
    .refine((v) => v === "on" || v === "true" || v === true, { error: msg });

export const SignupSchema = z.object({
  childName: z
    .string({ error: "아이 이름(또는 별명)을 입력해 주세요." })
    .trim()
    .min(1, { error: "아이 이름(또는 별명)을 입력해 주세요." })
    .max(20, { error: "이름은 20자 이내로 입력해 주세요." }),
  email: z
    .string({ error: "이메일을 입력해 주세요." })
    .trim()
    .email({ error: "올바른 이메일 형식이 아닙니다." }),
  password: z
    .string({ error: "비밀번호를 입력해 주세요." })
    .min(8, { error: "비밀번호는 8자 이상이어야 합니다." })
    .regex(/[A-Za-z]/, { error: "영문자를 하나 이상 포함해야 합니다." })
    .regex(/[0-9]/, { error: "숫자를 하나 이상 포함해야 합니다." }),
  // 정통망법 §31 — 만 14세 미만 아동은 법정대리인의 동의 절차가 별도 필요하므로,
  // 본 서비스는 가입자(보호자) 본인이 만 14세 이상임을 확인받는다.
  agreeAge: requiredAgreement("만 14세 이상 보호자 확인이 필요합니다."),
  // 약관규제법 — 이용약관 동의.
  agreeTerms: requiredAgreement("이용약관에 동의해 주세요."),
  // 개인정보보호법 §22 — 개인정보 수집·이용 동의는 다른 동의와 분리하여 받아야 한다.
  agreePrivacy: requiredAgreement("개인정보 수집·이용에 동의해 주세요."),
});

export type LoginFormState =
  | {
      ok?: false;
      errors?: {
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | { ok: true; email: string }
  | undefined;

export type SignupFormState =
  | {
      ok?: false;
      errors?: {
        childName?: string[];
        email?: string[];
        password?: string[];
        agreeAge?: string[];
        agreeTerms?: string[];
        agreePrivacy?: string[];
      };
      message?: string;
    }
  | { ok: true; email: string; childName: string }
  | undefined;
