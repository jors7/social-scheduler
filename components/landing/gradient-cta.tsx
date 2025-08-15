'use client'

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const GradientCTA = () => {
  return (
    <div 
      className="w-full bg-gradient-to-r from-blue-600 via-teal-500 to-indigo-600 flex items-center justify-center" 
      style={{ minHeight: '460px' }}
    >
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-8 leading-tight"
        >
          YOU FOCUS ON CONTENT. WE&apos;LL HANDLE THE TIMING.
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Link 
            href="/pricing" 
            className="bg-white text-gray-900 font-semibold px-8 py-4 rounded-full text-lg hover:bg-gray-100 transition-colors duration-200 shadow-lg inline-block"
          >
            Get Started For Free →
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default GradientCTA;