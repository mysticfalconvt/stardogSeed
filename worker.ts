import { generateAndAddData } from "./generateAndAddData.ts";

self.onmessage = async (e) => {
  const {
    classId,
    personPerClassCount,
    accountPerPersonCount,
    orderPerAccountCount,
    productPerOrderCount,
  } = e.data;

  try {
    await generateAndAddData(
      classId,
      personPerClassCount,
      accountPerPersonCount,
      orderPerAccountCount,
      productPerOrderCount,
    );
    self.postMessage({
      success: true,
      classId,
      message: `Data generated for Person Class ${classId}`,
    });
  } catch (error) {
    self.postMessage({
      success: false,
      classId,
      error: error.message,
    });
  }
};
