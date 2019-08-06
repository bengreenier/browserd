import { v4 as uuid } from "uuid";
import { Signal } from "../../shared/src/signal";

export const connect = async () => {
  const signalProvider = new Signal({
    pollIntervalMs: $("#poll-interval").val() as number,
    url: $("#signaling-server").val() as string,
  });

  await signalProvider.signIn(`${uuid()}`);
};

$(document).ready(() => {
  $("#connect").click(() => connect());
});
