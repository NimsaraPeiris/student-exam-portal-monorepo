'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, App } from 'antd';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AntdRegistry>
        <ConfigProvider theme={{ token: { colorPrimary: '#02b6d6ff' } }}>
          <App>
            {children}
          </App>
        </ConfigProvider>
      </AntdRegistry>
    </QueryClientProvider>
  );
}