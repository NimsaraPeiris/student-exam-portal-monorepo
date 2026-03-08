'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, Input, Button, Card, Typography, Space, App } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';

const { Title, Text } = Typography;

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);
    const { message } = App.useApp();

    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        try {
            const res = await api.post('/auth/login', data);

            if (res.status === 200 || res.status === 201) {
                const { user, access_token } = res.data;
                setAuth(user, access_token);
                message.success('Login successful!');
                router.push('/dashboard');
            } else {
                message.error('Login failed');
            }
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#f0f2f5'
        }}>
            <Card style={{ width: 400, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    <div style={{ fontSize: 40, color: '#1677ff', marginBottom: 10 }}>🔑</div>
                    <Title level={2}>Welcome Back</Title>
                    <Text type="secondary">Sign in to your account</Text>
                </div>

                <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
                    <Form.Item
                        label="Email"
                        validateStatus={errors.email ? 'error' : ''}
                        help={errors.email?.message}
                    >
                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => (
                                <Input {...field} prefix={<MailOutlined />} placeholder="email@example.com" size="large" />
                            )}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Password"
                        validateStatus={errors.password ? 'error' : ''}
                        help={errors.password?.message}
                    >
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <Input.Password {...field} prefix={<LockOutlined />} placeholder="Password" size="large" />
                            )}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={isSubmitting} block size="large">
                            Log in
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">
                            Don't have an account? <Link href="/register">Register</Link>
                        </Text>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
