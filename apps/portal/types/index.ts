export interface Paper {
    id: string;
    title: string;
    subject: string;
    year: number;
    price_lkr: number;
    type: string;
    exam_board: string;
    is_purchased: boolean;
}

export interface Choice {
    id: string;
    content: string;
}

export interface Question {
    id: string;
    content: string;
    choices: Choice[];
}

export interface ExamSession {
    session_id: string;
    paper_id: string;
    expires_at: string;
}

export interface AnswerResponse {
    is_correct: boolean;
    correct_choice_id?: string;
    explanation?: string;
}

export interface SubmissionResponse {
    score: number;
    total_questions: number;
    percentage: number;
}

export interface ExamHistory {
    session_id: string;
    started_at: string;
    expires_at: string;
    submitted_at: string;
    score_pct: string;
    status: string;
    paper_id: string;
    title: string;
    subject: string;
    exam_board: string;
    year: number;
}
