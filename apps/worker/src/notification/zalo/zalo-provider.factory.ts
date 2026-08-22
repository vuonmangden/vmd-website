import { Injectable } from '@nestjs/common';
import { loadZaloConfiguration } from './zalo.configuration';
import { MockZaloProvider } from './mock-zalo.provider';
import { ZaloDeliveryError, type ZaloProvider } from './zalo.types';

@Injectable()
export class ZaloProviderFactory {
  create(): ZaloProvider {
    const configuration = loadZaloConfiguration();
    if (!configuration.enabled) {
      throw new ZaloDeliveryError('disabled', false, null);
    }

    return new MockZaloProvider(configuration);
  }
}
