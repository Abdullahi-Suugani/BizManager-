import type { Request, Response } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: z.nativeEnum(Role).optional(),
  action: z.string().trim().max(80).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
}).refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: "The start date must be on or before the end date"
});

export async function listActivity(req: Request, res: Response) {
  const query = querySchema.parse(req.query);
  const occurredAt: { gte?: Date; lt?: Date } = {};
  if (query.from) occurredAt.gte = new Date(`${query.from}T00:00:00.000Z`);
  if (query.to) {
    const end = new Date(`${query.to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    occurredAt.lt = end;
  }

  const where = {
    ...(query.search ? { actorName: { contains: query.search, mode: "insensitive" as const } } : {}),
    ...(query.role ? { actorRole: query.role } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(Object.keys(occurredAt).length ? { occurredAt } : {})
  };
  const [logs, total] = await prisma.$transaction([
    prisma.activityLog.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    }),
    prisma.activityLog.count({ where })
  ]);
  res.json({
    logs,
    pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) }
  });
}
