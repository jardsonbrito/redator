-- Testar o trigger manualmente
UPDATE redacoes_enviadas 
SET status_corretor_1 = 'corrigida',
    nota_final_corretor_1 = 800,
    c1_corretor_1 = 160,
    c2_corretor_1 = 160,
    c3_corretor_1 = 160,
    c4_corretor_1 = 160,
    c5_corretor_1 = 160
WHERE id = '36a3239a-64d1-4e30-b365-5cf1988f877c';