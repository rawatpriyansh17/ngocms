import React from 'react'

interface LoaderProps {
   size?: number
   className?: string
}

export default function Loader({
   size = 100,
   className,
}: LoaderProps) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 100 100"
         preserveAspectRatio="xMidYMid"
         width={size}
         height={size}
         className={className}
         style={{
            shapeRendering: 'auto',
            display: 'block',
            background: 'transparent',
         }}
      >
         <g>
            <rect fill="#FF0000" height="54" width="19" y="23" x="15.5">
               <animate
                  begin="-0.175s"
                  keySplines="0 0.5 0.5 1;0 0.5 0.5 1"
                  values="6.8;23;23"
                  keyTimes="0;0.5;1"
                  calcMode="spline"
                  dur="0.577s"
                  repeatCount="indefinite"
                  attributeName="y"
               />
               <animate
                  begin="-0.175s"
                  keySplines="0 0.5 0.5 1;0 0.5 0.5 1"
                  values="86.4;54;54"
                  keyTimes="0;0.5;1"
                  calcMode="spline"
                  dur="0.577s"
                  repeatCount="indefinite"
                  attributeName="height"
               />
            </rect>
            <rect fill="#FF0088" height="54" width="19" y="23" x="40.5">
               <animate
                  begin="-0.087s"
                  keySplines="0 0.5 0.5 1;0 0.5 0.5 1"
                  values="10.8;23;23"
                  keyTimes="0;0.5;1"
                  calcMode="spline"
                  dur="0.577s"
                  repeatCount="indefinite"
                  attributeName="y"
               />
               <animate
                  begin="-0.087s"
                  keySplines="0 0.5 0.5 1;0 0.5 0.5 1"
                  values="78.3;54;54"
                  keyTimes="0;0.5;1"
                  calcMode="spline"
                  dur="0.577s"
                  repeatCount="indefinite"
                  attributeName="height"
               />
            </rect>
            <rect fill="#FF02FF" height="54" width="19" y="23" x="65.5">
               <animate
                  keySplines="0 0.5 0.5 1;0 0.5 0.5 1"
                  values="10.8;23;23"
                  keyTimes="0;0.5;1"
                  calcMode="spline"
                  dur="0.577s"
                  repeatCount="indefinite"
                  attributeName="y"
               />
               <animate
                  keySplines="0 0.5 0.5 1;0 0.5 0.5 1"
                  values="78.3;54;54"
                  keyTimes="0;0.5;1"
                  calcMode="spline"
                  dur="0.577s"
                  repeatCount="indefinite"
                  attributeName="height"
               />
            </rect>
         </g>
      </svg>
   )
}