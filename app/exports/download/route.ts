import type { NextRequest } from "next/server";
import { createCsv, createExportDate } from "@/lib/exports";
import { prisma } from "@/lib/prisma";

const exportFormats = [
  "backup-json",
  "people-csv",
  "debts-csv",
  "payments-csv",
  "installments-csv",
] as const;

type ExportFormat = (typeof exportFormats)[number];

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format");

  if (!isExportFormat(format)) {
    return new Response("Unknown export format.", { status: 400 });
  }

  const exportedAt = new Date();
  const people = await prisma.person.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      debts: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          payments: {
            orderBy: [{ paidAt: "asc" }, { id: "asc" }],
            include: {
              installment: {
                select: { id: true },
              },
            },
          },
          installments: {
            orderBy: [{ sequence: "asc" }, { id: "asc" }],
          },
        },
      },
    },
  });

  const date = createExportDate(exportedAt);

  if (format === "backup-json") {
    return downloadResponse(
      JSON.stringify(
        {
          schemaVersion: 1,
          exportedAt: exportedAt.toISOString(),
          people,
        },
        null,
        2,
      ),
      `money-tracker-backup-${date}.json`,
      "application/json; charset=utf-8",
    );
  }

  if (format === "people-csv") {
    return downloadResponse(
      createCsv(
        ["id", "name", "notes", "createdAt", "updatedAt"],
        people.map((person) => [
          person.id,
          person.name,
          person.notes,
          person.createdAt,
          person.updatedAt,
        ]),
      ),
      `money-tracker-people-${date}.csv`,
      "text/csv; charset=utf-8",
      true,
    );
  }

  const debts = people.flatMap((person) =>
    person.debts.map((debt) => ({ ...debt, person })),
  );

  if (format === "debts-csv") {
    return downloadResponse(
      createCsv(
        [
          "id",
          "personId",
          "personName",
          "description",
          "amount",
          "incurredAt",
          "notes",
          "createdAt",
          "updatedAt",
        ],
        debts.map((debt) => [
          debt.id,
          debt.personId,
          debt.person.name,
          debt.description,
          debt.amount.toFixed(2),
          debt.incurredAt,
          debt.notes,
          debt.createdAt,
          debt.updatedAt,
        ]),
      ),
      `money-tracker-debts-${date}.csv`,
      "text/csv; charset=utf-8",
      true,
    );
  }

  if (format === "payments-csv") {
    return downloadResponse(
      createCsv(
        [
          "id",
          "debtId",
          "personId",
          "personName",
          "debtDescription",
          "amount",
          "paidAt",
          "notes",
          "installmentId",
          "createdAt",
          "updatedAt",
        ],
        debts.flatMap((debt) =>
          debt.payments.map((payment) => [
            payment.id,
            payment.debtId,
            debt.personId,
            debt.person.name,
            debt.description,
            payment.amount.toFixed(2),
            payment.paidAt,
            payment.notes,
            payment.installment?.id,
            payment.createdAt,
            payment.updatedAt,
          ]),
        ),
      ),
      `money-tracker-payments-${date}.csv`,
      "text/csv; charset=utf-8",
      true,
    );
  }

  return downloadResponse(
    createCsv(
      [
        "id",
        "debtId",
        "personId",
        "personName",
        "debtDescription",
        "sequence",
        "amount",
        "dueAt",
        "paymentId",
        "status",
        "createdAt",
        "updatedAt",
      ],
      debts.flatMap((debt) =>
        debt.installments.map((installment) => [
          installment.id,
          installment.debtId,
          debt.personId,
          debt.person.name,
          debt.description,
          installment.sequence,
          installment.amount.toFixed(2),
          installment.dueAt,
          installment.paymentId,
          installment.paymentId ? "paid" : "unpaid",
          installment.createdAt,
          installment.updatedAt,
        ]),
      ),
    ),
    `money-tracker-installments-${date}.csv`,
    "text/csv; charset=utf-8",
    true,
  );
}

function isExportFormat(value: string | null): value is ExportFormat {
  return exportFormats.some((format) => format === value);
}

function downloadResponse(
  body: string,
  filename: string,
  contentType: string,
  includeBom = false,
) {
  return new Response(includeBom ? `\uFEFF${body}` : body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
