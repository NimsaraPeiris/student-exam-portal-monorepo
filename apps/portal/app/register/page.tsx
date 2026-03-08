'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, Input, Button, Card, Typography, Space, App } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const { Title, Text } = Typography;

const registerSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const { message } = App.useApp();

    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterForm) => {
        try {
            const res = await api.post('/auth/register', {
                email: data.email,
                password: data.password,
                full_name: data.fullName,
            });

            if (res.status === 201 || res.status === 200) {
                message.success('Registration successful! Please log in.');
                router.push('/login');
            } else {
                message.error('Registration failed. Please try again.');
            }
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Registration failed');
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
            <Card style={{ width: 450, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    <div style={{ fontSize: 40, color: '#1677ff', marginBottom: 10 }}>📝</div>
                    <Title level={2}>Create Account</Title>
                    <Text type="secondary">Sign up to get started with the Paper Management System</Text>
                </div>

                <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
                    <Form.Item
                        label="Full Name"
                        validateStatus={errors.fullName ? 'error' : ''}
                        help={errors.fullName?.message}
                    >
                        <Controller
                            name="fullName"
                            control={control}
                            render={({ field }) => (
                                <Input {...field} prefix={<UserOutlined />} placeholder="John Doe" size="large" />
                            )}
                        />
                    </Form.Item>

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

                    <Form.Item
                        label="Confirm Password"
                        validateStatus={errors.confirmPassword ? 'error' : ''}
                        help={errors.confirmPassword?.message}
                    >
                        <Controller
                            name="confirmPassword"
                            control={control}
                            render={({ field }) => (
                                <Input.Password {...field} prefix={<LockOutlined />} placeholder="Confirm Password" size="large" />
                            )}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={isSubmitting} block size="large">
                            Register
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">
                            Already have an account? <Link href="/login">Log in</Link>
                        </Text>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
