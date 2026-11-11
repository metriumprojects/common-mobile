export const passkeys = {
  isSupported: () => false,
  get: async () => {
    throw new Error('Passkeys are not enabled in this build.');
  },
  create: async () => {
    throw new Error('Passkeys are not enabled in this build.');
  },
};

export default {
  passkeys,
};

