import { IUser } from "@fluidframework/protocol-definitions";
import { ICodeLoader, IFluidModule } from "@fluidframework/container-definitions";
import { ContainerRuntimeFactoryWithDefaultDataStore } from "@fluidframework/aqueduct";
import { RouterliciousDocumentServiceFactory } from "@fluidframework/routerlicious-driver";
import { Container, Loader } from "@fluidframework/container-loader";
import { InsecureTokenProvider, InsecureUrlResolver } from "@fluidframework/test-runtime-utils";
import { ShellDDS } from "./model/shell";

// Tinylicious service endpoints
const hostUrl = "http://localhost:7070";
const ordererUrl = "http://localhost:7070";
const storageUrl = "http://localhost:7070";

// Use the application name as a tinylicious tenant ID
const tenantId = "nteract";
// Key is not used by tinylicious
const tenantKey = "unused";
const bearerSecret = "";

const user = {
  id: "test", // Required value
  name: "Test User" // Optional value that we included
} as IUser;

const fluidExport = new ContainerRuntimeFactoryWithDefaultDataStore(
  ShellDDS.Factory,
  new Map([ShellDDS.Factory.registryEntry])
);

export async function loadContainer(url: string): Promise<[Container, ShellDDS]> {
  const urlResolver = new InsecureUrlResolver(hostUrl, ordererUrl, storageUrl, tenantId, bearerSecret);

  const tokenProvider = new InsecureTokenProvider(tenantKey, user);

  const documentServiceFactory = new RouterliciousDocumentServiceFactory(tokenProvider);

  const codeLoader = new (class implements ICodeLoader {
    async load(): Promise<IFluidModule> {
      const module = {
        fluidExport
      };
      return module;
    }
  })();

  const loader = new Loader({
    urlResolver,
    documentServiceFactory,
    codeLoader
  });

  const details = {
    package: {
      name: "@nteract/notebook",
      version: "1.0.0",
      fluid: { browser: {} }
    },
    config: {}
  };

  let container: Container | undefined;
  let retry = false;
  while (!container) {
    try {
      // const url = "https://localhost:8888/nteract/notebook";
      container = await loader.resolve({ url });
      break;
    } catch (error) {
      if (error.statusCode === 400) {
        // error occurred during the attempt to load a non-existing document
        // will try to create a new document with the same url
        container = undefined;
      } else {
        // unexpected error, re-throw
        throw error;
      }
    }
    if (retry) {
      throw new Error("Failed to load container");
    }
    retry = true;
    container = await loader.createDetachedContainer(details);
    try {
      await container.attach(urlResolver.createCreateNewRequest("matplotlib-21"));
    } catch (error) {
      throw error;
    }
  }

  if (!container.connected) {
    console.log("waiting for the container to get connected");
    await new Promise<void>((resolve, reject) => {
      container?.once("connected", () => resolve());
      container?.once("closed", (error) => reject(new Error(`Container closed unexpectedly. ${error?.message}`)));
    });
  }

  const response = await loader.request({ url });

  if (response.status !== 200 || response.mimeType !== "fluid/object") {
    throw new Error("Root object not found.");
  }

  const fluidObject = response.value as ShellDDS;
  return [container, fluidObject];
}
