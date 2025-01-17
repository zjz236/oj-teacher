#!/usr/bin/python
#! -*- coding: utf8 -*-

import lorun
import os

RESULT_STR = [
    'Accepted',
    'Presentation Error',
    'Time Limit Exceeded',
    'Memory Limit Exceeded',
    'Wrong Answer',
    'Runtime Error',
    'Output Limit Exceeded',
    'Compile Error',
    'System Error'
]

def compileSrc(src_path):
    if os.system('gcc %s -o m'%src_path) != 0:
        print('compile failure!')
        return False
    return True

def runone(p_path, in_path, out_path):
    fin = open(in_path)
    fout = open(out_path)
    ftemp = open('temp.out', 'w')

    runcfg = {
        'args':p_path,
        'fd_in':fin.fileno(),
        'fd_out':ftemp.fileno(),
        'timelimit':5000, #in MS
        'memorylimit':200000, #in KB
    }

    rst = lorun.run(runcfg)
    fin.close()
    ftemp.close()
    return rst

def judge(src_path, td_path, td_in):
        in_path = os.path.join(os.path.dirname(__file__), '../public/', td_path)
        out_path = os.path.join(os.path.dirname(__file__), '../public/', td_in)
        if os.path.isfile(in_path) and os.path.isfile(out_path):
            rst = runone(src_path, in_path, out_path)
            print(rst)
        else:
            print('testdata: incompleted')
            exit(-1)

if __name__ == '__main__':
    import sys
    if len(sys.argv) != 4:
        print('Usage:%s srcfile testdata_pth testdata_total')
        exit(-1)
    shell = sys.argv[1].split(',')
    judge(shell, sys.argv[2], sys.argv[3])
