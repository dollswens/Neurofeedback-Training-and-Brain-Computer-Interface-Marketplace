import { describe, it, expect, beforeEach } from 'vitest';

// Mock blockchain state
let trainingPrograms: { [key: number]: any } = {};
let userPrograms: { [key: string]: any } = {};
let lastProgramId = 0;

// Mock contract functions
const createProgram = (creator: string, title: string, description: string, duration: number, price: number) => {
  lastProgramId++;
  trainingPrograms[lastProgramId] = {
    creator,
    title,
    description,
    duration,
    price,
    active: true
  };
  return { success: true, value: lastProgramId };
};

const updateProgram = (sender: string, programId: number, title: string, description: string, duration: number, price: number, active: boolean) => {
  if (!trainingPrograms[programId] || trainingPrograms[programId].creator !== sender) {
    return { success: false, error: 401 };
  }
  trainingPrograms[programId] = {
    ...trainingPrograms[programId],
    title,
    description,
    duration,
    price,
    active
  };
  return { success: true };
};

const purchaseProgram = (buyer: string, programId: number) => {
  if (!trainingPrograms[programId] || !trainingPrograms[programId].active) {
    return { success: false, error: 404 };
  }
  const key = `${buyer}:${programId}`;
  if (userPrograms[key]) {
    return { success: false, error: 409 };
  }
  userPrograms[key] = {
    start_time: Date.now(),
    completed: false
  };
  return { success: true };
};

const completeProgram = (user: string, programId: number) => {
  const key = `${user}:${programId}`;
  if (!userPrograms[key]) {
    return { success: false, error: 404 };
  }
  userPrograms[key].completed = true;
  return { success: true };
};

const getProgram = (programId: number) => {
  return trainingPrograms[programId] || null;
};

const getUserProgram = (user: string, programId: number) => {
  const key = `${user}:${programId}`;
  return userPrograms[key] || null;
};

const getUserPrograms = (user: string) => {
  return Object.entries(userPrograms)
      .filter(([key]) => key.startsWith(user))
      .map(([key, value]) => {
        const programId = parseInt(key.split(':')[1]);
        return {
          program: trainingPrograms[programId],
          user_progress: value
        };
      })
      .slice(0, 10); // Limit to 10 programs as per the contract
};

describe('Neurofeedback Training Programs', () => {
  beforeEach(() => {
    trainingPrograms = {};
    userPrograms = {};
    lastProgramId = 0;
  });
  
  it('should create a training program', () => {
    const result = createProgram('creator1', 'Relaxation Training', 'Learn to relax your mind', 30, 1000);
    expect(result.success).toBe(true);
    expect(result.value).toBe(1);
    expect(trainingPrograms[1].title).toBe('Relaxation Training');
  });
  
  it('should update a training program', () => {
    createProgram('creator1', 'Relaxation Training', 'Learn to relax your mind', 30, 1000);
    const result = updateProgram('creator1', 1, 'Advanced Relaxation', 'Master relaxation techniques', 45, 1500, true);
    expect(result.success).toBe(true);
    expect(trainingPrograms[1].title).toBe('Advanced Relaxation');
    expect(trainingPrograms[1].price).toBe(1500);
  });
  
  it('should not allow unauthorized program updates', () => {
    createProgram('creator1', 'Relaxation Training', 'Learn to relax your mind', 30, 1000);
    const result = updateProgram('creator2', 1, 'Advanced Relaxation', 'Master relaxation techniques', 45, 1500, true);
    expect(result.success).toBe(false);
    expect(result.error).toBe(401);
  });
  
  it('should allow purchasing a program', () => {
    createProgram('creator1', 'Relaxation Training', 'Learn to relax your mind', 30, 1000);
    const result = purchaseProgram('user1', 1);
    expect(result.success).toBe(true);
    expect(userPrograms['user1:1']).toBeTruthy();
  });
  
  it('should not allow purchasing an inactive program', () => {
    createProgram('creator1', 'Relaxation Training', 'Learn to relax your mind', 30, 1000);
    updateProgram('creator1', 1, 'Relaxation Training', 'Learn to relax your mind', 30, 1000, false);
    const result = purchaseProgram('user1', 1);
    expect(result.success).toBe(false);
    expect(result.error).toBe(404);
  });
  
  it('should not allow purchasing a program twice', () => {
    createProgram('creator1', 'Relaxation Training', 'Learn to relax your mind', 30, 1000);
    purchaseProgram('user1', 1);
    const result = purchaseProgram('user1', 1);
    expect(result.success).toBe(false);
    expect(result.error).toBe(409);
  });
  
  it('should allow completing a program', () => {
    createProgram('creator1', 'Relaxation Training', 'Learn to relax your mind', 30, 1000);
    purchaseProgram('user1', 1);
    const result = completeProgram('user1', 1);
    expect(result.success).toBe(true);
    expect(userPrograms['user1:1'].completed).toBe(true);
  });
  
  it('should get program details', () => {
    createProgram('creator1', 'Relaxation Training', 'Learn to relax your mind', 30, 1000);
    const program = getProgram(1);
    expect(program).toBeTruthy();
    expect(program.title).toBe('Relaxation Training');
  });
  
  it('should get user program details', () => {
    createProgram('creator1', 'Relaxation Training', 'Learn to relax your mind', 30, 1000);
    purchaseProgram('user1', 1);
    const userProgram = getUserProgram('user1', 1);
    expect(userProgram).toBeTruthy();
    expect(userProgram.completed).toBe(false);
  });
  
  it('should get all user programs (up to 10)', () => {
    for (let i = 1; i <= 12; i++) {
      createProgram(`creator${i}`, `Program ${i}`, `Description ${i}`, 30, 1000);
      if (i <= 10) {
        purchaseProgram('user1', i);
      }
    }
    const userPrograms = getUserPrograms('user1');
    expect(userPrograms.length).toBe(10);
    expect(userPrograms[0].program.title).toBe('Program 1');
    expect(userPrograms[9].program.title).toBe('Program 10');
  });
});

