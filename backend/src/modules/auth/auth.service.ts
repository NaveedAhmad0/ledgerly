import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { signToken } from "../../middleware/auth";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "./auth.schema";

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  businessName: string | null;
  address: string | null;
  phone: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    businessName: user.businessName ?? "",
    address: user.address ?? "",
    phone: user.phone ?? "",
  };
}

export async function register(input: unknown) {
  const data = registerSchema.parse(input);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash },
  });

  return { user: publicUser(user), token: signToken(user.id) };
}

export async function login(input: unknown) {
  const data = loginSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new AppError(401, "Invalid credentials");

  const ok = await bcrypt.compare(data.password, user.passwordHash);
  if (!ok) throw new AppError(401, "Invalid credentials");

  return { user: publicUser(user), token: signToken(user.id) };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found");
  return publicUser(user);
}

export async function updateProfile(userId: string, input: unknown) {
  const data = updateProfileSchema.parse(input);
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });
  return publicUser(user);
}
