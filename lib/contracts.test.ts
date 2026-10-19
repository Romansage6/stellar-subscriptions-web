import { explainError } from "./stellar";
import {
  SUBSCRIPTION_ERRORS,
  contractsFor,
  cursorLedger,
  decodePlan,
  decodeStats,
  decodeSubscription,
  toNumber,
} from "./contracts";
import { scValToNative, xdr } from "@stellar/stellar-sdk";
import { SubStatus } from "@/types";

describe("event paging", () => {
  it("reads the ledger a cursor points at", () => {
    // A cursor returned by the Testnet RPC while scanning for charges.
    expect(cursorLedger("0019901701628624895-4294967295")).toBe(4_633_725);
  });
});

const SUBSCRIBER = "GBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4";
const MERCHANT = "GCLAL5UFF47MT7JMJHSS4BWXMMKJSTGYE62HJ5X77N45UKLF7BIDKKTU";
const XLM = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

describe("decoders", () => {
  it("decodes a subscription as returned by scValToNative", () => {
    const sub = decodeSubscription({
      id: 1n,
      subscriber: SUBSCRIBER,
      merchant: MERCHANT,
      token: XLM,
      amount_per_period: 10_000_000n,
      interval_ledgers: 720,
      total_cap: 120_000_000n,
      total_charged: 10_000_000n,
      start_ledger: 4_692_992,
      last_charge_ledger: 4_692_994,
      next_charge_ledger: 4_693_714,
      status: 0,
      plan_id: 1n,
    });
    expect(sub).toEqual({
      id: 1,
      subscriber: SUBSCRIBER,
      merchant: MERCHANT,
      token: XLM,
      amountPerPeriod: 10_000_000n,
      intervalLedgers: 720,
      totalCap: 120_000_000n,
      totalCharged: 10_000_000n,
      startLedger: 4_692_992,
      lastChargeLedger: 4_692_994,
      nextChargeLedger: 4_693_714,
      status: SubStatus.Active,
      planId: 1,
    });
  });

  it("decodes a plan", () => {
    const plan = decodePlan({
      id: 3n,
      merchant: MERCHANT,
      name: "Demo hourly",
      token: XLM,
      amount_per_period: 10_000_000n,
      interval_ledgers: 720,
      default_cap: 120_000_000n,
      active: true,
      created_at: 4_692_990,
    });
    expect(plan.id).toBe(3);
    expect(plan.name).toBe("Demo hourly");
    expect(plan.defaultCap).toBe(120_000_000n);
    expect(plan.active).toBe(true);
  });

  it("decodes registry stats", () => {
    expect(
      decodeStats({
        total_plans: 1n,
        total_subscriptions: 2n,
        active_subscriptions: 1n,
        total_charged_volume: 10_000_000n,
      }),
    ).toEqual({
      totalPlans: 1,
      totalSubscriptions: 2,
      activeSubscriptions: 1,
      totalChargedVolume: 10_000_000n,
    });
  });

  it("refuses ids too large to represent exactly", () => {
    expect(() => toNumber(2n ** 60n)).toThrow(/too large/);
  });
});

// Return values of the read functions as base64 `ScVal` XDR, the form the RPC
// hands back in simulation results. Decoding goes through the real
// `scValToNative`, so a renamed contract field no longer decodes.
const SUBSCRIPTION_XDR =
  "AAAAEQAAAAEAAAANAAAADwAAABFhbW91bnRfcGVyX3BlcmlvZAAAAAAAAAoAAAAAAAAAAAAAAAAAmJaAAAAADwAAAAJpZAAAAAAABQAAAAAAAAABAAAADwAAABBpbnRlcnZhbF9sZWRnZXJzAAAAAwAAAtAAAAAPAAAAEmxhc3RfY2hhcmdlX2xlZGdlcgAAAAAAAwBHnAIAAAAPAAAACG1lcmNoYW50AAAAEgAAAAAAAAAAlgX2hS8+yf0sSeUuBtdjFJlM2Ce0dPb/+3naKWX4UDUAAAAPAAAAEm5leHRfY2hhcmdlX2xlZGdlcgAAAAAAAwBHntIAAAAPAAAAB3BsYW5faWQAAAAABQAAAAAAAAABAAAADwAAAAxzdGFydF9sZWRnZXIAAAADAEecAAAAAA8AAAAGc3RhdHVzAAAAAAADAAAAAAAAAA8AAAAKc3Vic2NyaWJlcgAAAAAAEgAAAAAAAAAAVAqXPTCyxiK7yrK+0kouJ9GEOZ44/tep/0DT2nf5gSIAAAAPAAAABXRva2VuAAAAAAAAEgAAAAHXkotywnA8z+r365/0701QSlWouXn8m0UOoshCtNHOYQAAAA8AAAAJdG90YWxfY2FwAAAAAAAACgAAAAAAAAAAAAAAAAcnDgAAAAAPAAAADXRvdGFsX2NoYXJnZWQAAAAAAAAKAAAAAAAAAAAAAAAAAJiWgA==";
const PLAN_XDR =
  "AAAAEQAAAAEAAAAJAAAADwAAAAZhY3RpdmUAAAAAAAAAAAABAAAADwAAABFhbW91bnRfcGVyX3BlcmlvZAAAAAAAAAoAAAAAAAAAAAAAAAAAmJaAAAAADwAAAApjcmVhdGVkX2F0AAAAAAADAEeb/gAAAA8AAAALZGVmYXVsdF9jYXAAAAAACgAAAAAAAAAAAAAAAAcnDgAAAAAPAAAAAmlkAAAAAAAFAAAAAAAAAAMAAAAPAAAAEGludGVydmFsX2xlZGdlcnMAAAADAAAC0AAAAA8AAAAIbWVyY2hhbnQAAAASAAAAAAAAAACWBfaFLz7J/SxJ5S4G12MUmUzYJ7R09v/7edopZfhQNQAAAA8AAAAEbmFtZQAAAA4AAAALRGVtbyBob3VybHkAAAAADwAAAAV0b2tlbgAAAAAAABIAAAAB15KLcsJwPM/q9+uf9O9NUEpVqLl5/JtFDqLIQrTRzmE=";
const STATS_XDR =
  "AAAAEQAAAAEAAAAEAAAADwAAABRhY3RpdmVfc3Vic2NyaXB0aW9ucwAAAAUAAAAAAAAAAQAAAA8AAAAUdG90YWxfY2hhcmdlZF92b2x1bWUAAAAKAAAAAAAAAAAAAAAAAJiWgAAAAA8AAAALdG90YWxfcGxhbnMAAAAABQAAAAAAAAABAAAADwAAABN0b3RhbF9zdWJzY3JpcHRpb25zAAAAAAUAAAAAAAAAAg==";

function fixture(b64: string): Record<string, unknown> {
  return scValToNative(xdr.ScVal.fromXDR(b64, "base64")) as Record<string, unknown>;
}

describe("decoder fixtures", () => {
  it("decodes a subscription fixture", () => {
    expect(decodeSubscription(fixture(SUBSCRIPTION_XDR))).toEqual({
      id: 1,
      subscriber: SUBSCRIBER,
      merchant: MERCHANT,
      token: XLM,
      amountPerPeriod: 10_000_000n,
      intervalLedgers: 720,
      totalCap: 120_000_000n,
      totalCharged: 10_000_000n,
      startLedger: 4_692_992,
      lastChargeLedger: 4_692_994,
      nextChargeLedger: 4_693_714,
      status: SubStatus.Active,
      planId: 1,
    });
  });

  it("decodes a plan fixture", () => {
    expect(decodePlan(fixture(PLAN_XDR))).toEqual({
      id: 3,
      merchant: MERCHANT,
      name: "Demo hourly",
      token: XLM,
      amountPerPeriod: 10_000_000n,
      intervalLedgers: 720,
      defaultCap: 120_000_000n,
      active: true,
      createdAt: 4_692_990,
    });
  });

  it("decodes a registry stats fixture", () => {
    expect(decodeStats(fixture(STATS_XDR))).toEqual({
      totalPlans: 1,
      totalSubscriptions: 2,
      activeSubscriptions: 1,
      totalChargedVolume: 10_000_000n,
    });
  });

  it("fails when a contract field is renamed", () => {
    const sub = fixture(SUBSCRIPTION_XDR);
    const { total_cap: cap, ...rest } = sub;
    expect(() => decodeSubscription({ ...rest, cap_total: cap })).toThrow();
    const { total_plans: plans, ...stats } = fixture(STATS_XDR);
    expect(() => decodeStats({ ...stats, plan_count: plans })).toThrow();
  });
});

describe("contract errors", () => {
  it("explains the invariant rejections in plain language", () => {
    expect(explainError("HostError: Error(Contract, #12)", SUBSCRIPTION_ERRORS).message).toMatch(
      /over the cap/,
    );
    expect(explainError("Error(Contract, #11)", SUBSCRIPTION_ERRORS).message).toMatch(/Too early/);
    expect(explainError("Error(Contract, #14)", SUBSCRIPTION_ERRORS).message).toMatch(
      /No further charges can ever happen/,
    );
  });

  it("keeps the code and raw detail", () => {
    const err = explainError("Error(Contract, #9)", SUBSCRIPTION_ERRORS);
    expect(err.code).toBe(9);
    expect(err.detail).toBe("Error(Contract, #9)");
  });

  it("falls back for unknown codes", () => {
    expect(explainError("Error(Contract, #99)", SUBSCRIPTION_ERRORS).message).toMatch(/error 99/);
  });
});

describe("deployments", () => {
  it("has Testnet contracts and no Mainnet deployment by default", () => {
    expect(contractsFor("testnet")?.subscription).toMatch(/^C[A-Z0-9]{55}$/);
    expect(contractsFor("mainnet")).toBeNull();
  });
});
