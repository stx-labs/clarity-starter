import { tx } from "@stacks/clarinet-sdk";
import { Cl, ClarityType, UIntCV } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;

const initialCount = 1;
const initialHeight = 2;

describe("the chain reset between tests", () => {
  it("advances 20 blocks", () => {
    expect(simnet.blockHeight).toBe(initialHeight);
    simnet.mineEmptyBlocks(20);
    expect(simnet.blockHeight).toBe(initialHeight + 20);
  });

  it("is back to initial height", () => {
    expect(simnet.blockHeight).toBe(initialHeight);
  });
});

describe("test get counter", () => {
  it("ensures <get-count> send the counter value", async () => {
    const { result } = simnet.callReadOnlyFn(
      "counter",
      "get-count",
      [],
      address1,
    );

    expect(result).toHaveClarityType(ClarityType.UInt);
    expect(result).toBeUint(initialCount);
  });

  it("ensures <get-count> write cosst is 0 and read is 4", async () => {
    const { costs } = simnet.callReadOnlyFn(
      "counter",
      "get-count",
      [],
      address1,
    );
    expect(costs?.total.readCount).toBe(4);
    expect(costs?.total.writeCount).toBe(0);
  });

  it("ensures the counter variable hold the right value", () => {
    const counter = simnet.getDataVar("counter", "count");
    expect(counter).toBeUint(initialCount);
  });
});

describe("test <increment>", () => {
  it("ensures <increment> adds 1", () => {
    const { result } = simnet.callPublicFn(
      "counter",
      "increment",
      [],
      address1,
    );
    expect(result).toBeOk(Cl.bool(true));

    const counter = simnet.getDataVar("counter", "count");
    expect(counter).toBeUint(initialCount + 1);
  });

  it("ensures <increment> transfers 10 ustx", () => {
    const { events } = simnet.callPublicFn(
      "counter",
      "increment",
      [],
      address1,
    );
    expect(events.length).toBe(1);
    const transferEvent = events[0];
    expect(transferEvent.event).toBe("stx_transfer_event");
    expect(events[0].data).toMatchObject({
      amount: "10",
      sender: address1,
      recipient: simnet.deployer,
    });
  });
});

describe("test <decrement>", () => {
  it("ensures <decrement> removes 1", () => {
    const originalCounter = simnet.getDataVar("counter", "count");
    const originalValue = (originalCounter as UIntCV).value;

    const block = simnet.mineBlock([
      tx.callPublicFn("counter", "increment", [], address1),
      tx.callPublicFn("counter", "decrement", [], address1),
    ]);

    expect(block[0].result).toBeOk(Cl.bool(true));
    expect(block[1].result).toBeOk(Cl.bool(true));

    const counter = simnet.getDataVar("counter", "count");
    expect(counter).toBeUint(originalValue as number);
  });

  it("ensures <decrement> throws an error if result is lower than 0", async () => {
    for (let i = 0; i < initialCount; i++) {
      simnet.callPublicFn("counter", "decrement", [], address1);
    }
    simnet.callPublicFn("counter", "decrement", [], address1);
    const { result } = simnet.callPublicFn(
      "counter",
      "decrement",
      [],
      address1,
    );
    expect(result).toBeErr(Cl.uint(1001));
  });
});

describe("test <add>", () => {
  it("ensures <add> adds up the right amout", () => {
    const { result } = simnet.callPublicFn(
      "counter",
      "add",
      [Cl.uint(3)],
      address1,
    );
    expect(result).toBeOk(Cl.bool(true));

    const counter = simnet.getDataVar("counter", "count");
    expect(counter).toBeUint(initialCount + 3);
  });

  it("ensures <add> transfers right amout of ustx", () => {
    const { events } = simnet.callPublicFn(
      "counter",
      "add",
      [Cl.uint(3)],
      address1,
    );

    expect(events.length).toBe(1);
    const transferEvent = events[0];
    expect(transferEvent.event).toBe("stx_transfer_event");
    expect(events[0].data).toMatchObject({
      amount: "30",
      sender: address1,
      recipient: simnet.deployer,
    });
  });

  it("ensures <add> throws an error if n is too low", () => {
    const { result } = simnet.callPublicFn(
      "counter",
      "add",
      [Cl.uint(1)],
      address1,
    );
    expect(result).toBeErr(Cl.uint(1002));
  });
});

describe("test get counter at block height", () => {
  it("ensures <get-count> send the counter value", () => {
    const height1 = Cl.uint(simnet.blockHeight);
    simnet.callPublicFn("counter", "increment", [], address1);
    const height2 = Cl.uint(simnet.blockHeight);
    simnet.callPublicFn("counter", "increment", [], address1);

    const atBlock1 = simnet.callReadOnlyFn(
      "counter",
      "get-count-at-block",
      [height1],
      address1,
    );
    expect(atBlock1.result).toBeOk(Cl.uint(initialCount));
    const atBlock2 = simnet.callReadOnlyFn(
      "counter",
      "get-count-at-block",
      [height2],
      address1,
    );
    expect(atBlock2.result).toBeOk(Cl.uint(initialCount + 1));
  });

  // we can actualy get the values in two ways
  it("ensures the counter variable hold the right value", () => {
    const counter = simnet.getDataVar("counter", "count");
    expect(counter).toBeUint(initialCount);
  });
});
