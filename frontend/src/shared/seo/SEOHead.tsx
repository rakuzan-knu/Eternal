import React from 'react';
import { useSEO } from './useSEO';
import { SEOProps } from './types';

export const SEOHead: React.FC<SEOProps> = (props) => {
  useSEO(props);
  return null;
};
